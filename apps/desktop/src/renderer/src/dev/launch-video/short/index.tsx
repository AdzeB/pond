import "@/styles.css";
import { host } from "../stage/host";
import { Composition } from "./composition";
import { DURATION } from "./timeline";

host(Composition, DURATION, { app: false });
