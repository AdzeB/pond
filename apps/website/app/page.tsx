import { Faqs } from "./components/faqs";
import { Features } from "./components/features";
import { Footer } from "./components/footer";
import { Get } from "./components/get";
import { Header } from "./components/header";
import { Hero } from "./components/hero";
import { Setup } from "./components/setup";

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <Setup />
        <Faqs />
        <Get />
      </main>
      <Footer />
    </>
  );
}
