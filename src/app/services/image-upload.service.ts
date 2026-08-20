import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Observable, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ImageUploadService {
  constructor(private http: HttpClient) {}

  uploadImage(file: File): Observable<string> {
    const cloudName = (environment as any).cloudinaryConfig?.cloudName;
    const uploadPreset = (environment as any).cloudinaryConfig?.uploadPreset;

    // 1. If Cloudinary is configured, upload directly to Cloudinary (Free 25GB)
    if (cloudName && uploadPreset && cloudName !== 'YOUR_CLOUD_NAME') {
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      return this.http.post<any>(url, formData).pipe(
        map((res) => res.secure_url || res.url),
        catchError((err) => {
          console.warn('Cloudinary upload warning, falling back to auto-compressed image:', err);
          return from(this.fileToCompressedBase64(file));
        })
      );
    }

    // 2. Default Instant Fallback: Auto-compress & WebP/JPEG (Works 100% out of the box with zero config!)
    return from(this.fileToCompressedBase64(file));
  }

  public fileToCompressedBase64(file: File, maxWidth = 800): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
}
