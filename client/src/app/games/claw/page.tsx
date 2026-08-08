import { redirect } from "next/navigation";

/** Old /games/claw path → /play */
export default function ClawRedirect() {
  redirect("/play");
}
