import { Archive } from "./components/archive";
import { Download } from "./components/download";
import { Faqs } from "./components/faqs";
import { Footer } from "./components/footer";
import { Header } from "./components/header";
import { Hero } from "./components/hero";
import { Library } from "./components/library";
import { LocalFirst } from "./components/local-first";
import { Search } from "./components/search";
import { Sources } from "./components/sources";

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Sources />
        <Library />
        <Archive />
        <Search />
        <LocalFirst />
        <Download />
        <Faqs />
      </main>
      <Footer />
    </>
  );
}
