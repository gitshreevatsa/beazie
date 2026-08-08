import { toast } from "@/components/ui/use-toast";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const inputChecks = (
  whichToBeChecked: string,
  wager: string | number,
  bet: string | number,
  userChoiced: string | number | readonly number[] | undefined
) => {
  switch (whichToBeChecked) {
    default:
      if (!wager) {
        toast({
          title: "Please, add valid wager",
        });
        return false;
      }
      if (!bet || Number(bet) <= 0) {
        toast({
          title: "Please, place valid bet!",
        });
        return false;
      }
      if (!userChoiced) {
        toast({
          title: "Please, Choose heads or tails!",
        });
        return false;
      }
      return true;
  }
};
