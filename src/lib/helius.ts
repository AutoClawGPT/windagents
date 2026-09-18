import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

export function getRpcUrl(): string {
  if (process.env.HELIUS_API_KEY) {
    return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  }
  return process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
}

export function getConnection(): Connection {
  return new Connection(getRpcUrl(), "confirmed");
}

export async function getSolBalance(address: string): Promise<{
  address: string;
  lamports: number;
  sol: number;
  rpc: string;
  provider: "helius" | "public";
}> {
  const conn = getConnection();
  const pubkey = new PublicKey(address);
  const lamports = await conn.getBalance(pubkey);
  return {
    address,
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
    rpc: process.env.HELIUS_API_KEY ? "helius" : "public",
    provider: process.env.HELIUS_API_KEY ? "helius" : "public",
  };
}

export async function getTokenAccounts(address: string) {
  const conn = getConnection();
  const pubkey = new PublicKey(address);
  const resp = await conn.getParsedTokenAccountsByOwner(pubkey, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });
  return resp.value.map((v) => {
    const info = v.account.data.parsed.info;
    return {
      mint: info.mint as string,
      amount: info.tokenAmount.uiAmount as number | null,
      decimals: info.tokenAmount.decimals as number,
      raw: info.tokenAmount.amount as string,
    };
  });
}
