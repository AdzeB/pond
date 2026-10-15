import { Film } from "./components/film";
import { Intro } from "./components/intro";
import { Sounds } from "./components/sounds";
import { Splash } from "./components/splash";

export default function Page() {
  return (
    <>
      <Splash />
      <Sounds />
      <main>
        <Intro />
        <Film />
      </main>
    </>
  );
}
