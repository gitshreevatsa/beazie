"use client";
import clsx from "clsx";
import { ChevronDown, LogOutIcon, Wallet, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount, useDisconnect, useBalance, useReadContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { BALANCE_REFRESH_EVENT } from "@/utils/beazie";
import { beazieClawABI, beazieClawAddress } from "@/utils/contract";

export default function NavDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { data: balance, refetch } = useBalance({ address });
  const { data: owner } = useReadContract({
    address: beazieClawAddress,
    abi: beazieClawABI,
    functionName: "owner",
  });

  const isOwner = Boolean(address && owner && address.toLowerCase() === String(owner).toLowerCase());
  const accountAddress = address?.slice(0, 6)?.toLowerCase();
  const eth = balance ? Number(formatEther(balance.value)).toFixed(4) : "0";

  useEffect(() => {
    const refresh = () => refetch();
    window.addEventListener(BALANCE_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(BALANCE_REFRESH_EVENT, refresh);
  }, [refetch]);

  return (
    <div className="relative">
      {isConnected ? (
        <button
          onBlur={() => setIsOpen(false)}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xl font-base"
        >
          <div className="flex items-center gap-2 font-semibold hover:text-yellow-500">
            <Wallet className="h-5 w-5" />
            <p>{eth} ETH</p>
          </div>
          <ChevronDown
            className={clsx(isOpen ? "rotate-180" : "rotate-0", "h-5 w-5 transition-transform")}
            color="black"
          />
        </button>
      ) : (
        <button
          onBlur={() => setIsOpen(false)}
          onClick={openConnectModal}
          className="flex items-center gap-2 text-xl font-base"
        >
          Login
        </button>
      )}

      <div
        className={clsx(
          isOpen ? "visible top-12 opacity-100 right-1" : "invisible top-10 right-1 opacity-0",
          "absolute flex w-[160px] flex-col rounded-base border-2 border-black bg-white text-lg font-base transition-all"
        )}
      >
        <div className="flex items-center rounded-t-base border-b-2 border-b-black px-4 py-3 text-left">
          {accountAddress}…
        </div>

        {isOwner && (
          <Link
            href="/owner"
            onMouseDown={() => setIsOpen(false)}
            className="flex items-center border-b-2 border-b-black px-4 py-3 text-left hover:bg-main"
          >
            <ShieldCheck className="mr-3 h-5 w-5" />
            Owner
          </Link>
        )}

        <div
          onClick={() => {
            disconnect();
            setIsOpen(false);
          }}
          className="flex cursor-pointer items-center border-b-2 border-b-black px-4 py-3 text-left hover:bg-red-500 hover:text-white"
        >
          <LogOutIcon className="mr-3 h-5 w-5" />
          Logout
        </div>
      </div>
    </div>
  );
}
