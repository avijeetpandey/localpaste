import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CryptoService {
  async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }

  async exportKeyAsBase64(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey('raw', key);
    return this._bufToBase64url(new Uint8Array(raw));
  }

  async importKeyFromBase64(b64: string): Promise<CryptoKey> {
    const raw = this._base64urlToBuf(b64);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  }

  async encrypt(plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertextBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
    return {
      ciphertext: this._bufToBase64url(new Uint8Array(ciphertextBuf)),
      iv: this._bufToBase64url(iv),
    };
  }

  async decrypt(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
    const ciphertextBuf = this._base64urlToBuf(ciphertext);
    const ivBuf = this._base64urlToBuf(iv);
    const plaintextBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, key, ciphertextBuf);
    return new TextDecoder().decode(plaintextBuf);
  }

  async encryptForUpload(plaintext: string): Promise<{ encrypted: string; keyFragment: string; iv: string }> {
    const key = await this.generateKey();
    const { ciphertext, iv } = await this.encrypt(plaintext, key);
    const keyFragment = await this.exportKeyAsBase64(key);
    return { encrypted: ciphertext, keyFragment, iv };
  }

  private _bufToBase64url(buf: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private _base64urlToBuf(b64: string): Uint8Array {
    const padded = b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
}
