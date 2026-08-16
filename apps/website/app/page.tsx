import { Features } from "./components/features";
import { Footer } from "./components/footer";
import { Hero } from "./components/hero";

export default function Page() {
  return (
    <>
      <main>
        <Hero />
        <Features />
      </main>
      <Footer />
    </>
  );
}
