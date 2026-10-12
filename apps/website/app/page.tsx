import { Film } from "./components/film";
import { Intro } from "./components/intro";
import { Splash } from "./components/splash";

export default function Page() {
  return (
    <>
      <Splash />
      <main>
        <Intro />
        <Film />
      </main>
    </>
  );
}
