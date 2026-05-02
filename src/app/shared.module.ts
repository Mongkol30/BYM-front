// shared/shared.module.ts
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@NgModule({
  imports: [
    MatIconModule
    ,MatButtonModule
    ,RouterLink
  ],
  exports: [
    MatIconModule
    ,MatButtonModule
    ,RouterLink
  ],
})
export class SharedModule {}