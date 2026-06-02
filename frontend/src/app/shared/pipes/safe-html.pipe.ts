import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/** Marks a string as safe HTML (used for highlight.js output only). */
@Pipe({ name: 'safeHtml', standalone: true, pure: true })
export class SafeHtmlPipe implements PipeTransform {
  private san = inject(DomSanitizer);
  transform(html: string): SafeHtml {
    return this.san.bypassSecurityTrustHtml(html);
  }
}
