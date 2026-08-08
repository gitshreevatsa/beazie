import Link from "next/link";
import MobileDrawer from "@/components/MobileDrawer";
import NavDropdown from "./NavDropdown";

function Navbar() {
  return (
    <nav className="fixed left-0 top-0 z-20 mx-auto flex h-[72px] w-full items-center border-b-4 border-ink bg-butter px-5 m500:h-14">
      <div className="mx-auto flex w-[1300px] max-w-full items-center justify-between">
        <MobileDrawer />

        <div className="flex items-center gap-8 m400:flex-1 m400:pl-5">
          <Link
            className="font-display text-3xl font-extrabold tracking-tight text-ink m500:text-xl"
            href="/"
          >
            Beazie
          </Link>
          <Link
            href="/games/claw"
            className="hidden font-body text-sm font-semibold text-ink/70 transition-colors hover:text-ink sm:inline"
          >
            The Claw
          </Link>
        </div>

        <NavDropdown />
      </div>
    </nav>
  );
}

export default Navbar;
