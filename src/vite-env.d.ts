/// <reference types="vite/client" />

interface PasswordCredential extends Credential {
  readonly id: string;
  readonly password: string;
  readonly name: string;
}

declare var PasswordCredential: {
  prototype: PasswordCredential;
  new (data: { id: string; password: string; name?: string }): PasswordCredential;
};
