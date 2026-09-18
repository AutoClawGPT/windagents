import nacl from "tweetnacl";
import bs58mod from "bs58";
const bs58 = (bs58mod as any).default || bs58mod;

export function verifyEd25519(params: {
  publicKey: string;
  signature: string;
  message: string;
}): boolean {
  try {
    const pub = bs58.decode(params.publicKey);
    const sig = bs58.decode(params.signature);
    const msg = new TextEncoder().encode(params.message);
    return nacl.sign.detached.verify(msg, sig, pub);
  } catch {
    return false;
  }
}

export function generateKeypair() {
  const kp = nacl.sign.keyPair();
  return {
    publicKey: bs58.encode(kp.publicKey),
    secretKey: Buffer.from(kp.secretKey).toString("hex"),
  };
}

export function signMessage(message: string, secretKeyHex: string) {
  const secretKey = Buffer.from(secretKeyHex, "hex");
  const sig = nacl.sign.detached(new TextEncoder().encode(message), secretKey);
  return bs58.encode(sig);
}
