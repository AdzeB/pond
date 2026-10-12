import "../clock";
import "@/styles.css";
import { host } from "../stage/host";
import { Composition } from "./composition";
import "./script";
import { DURATION } from "./timeline";

host(Composition, DURATION);
