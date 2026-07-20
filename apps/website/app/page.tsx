import { Browse } from "./components/browse";
import { Faqs } from "./components/faqs";
import { Find } from "./components/find";
import { Footer } from "./components/footer";
import { Get } from "./components/get";
import { Header } from "./components/header";
import { Hero } from "./components/hero";
import { Own } from "./components/own";
import { Save } from "./components/save";
import { Setup } from "./components/setup";

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Save />
        <Browse />
        <Find />
        <Own />
        <Setup />
        <Faqs />
        <Get />
      </main>
      <Footer />
    </>
  );
}
