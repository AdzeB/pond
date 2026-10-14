import "../clock";
import "@/styles.css";
import { Composition } from "./composition";
import { host } from "./host";
import "./script";
import { DURATION } from "./timeline";

host(Composition, DURATION);
