import { createFileRoute } from "@tanstack/react-router";
import { PropostasPage } from "@/modules/propostas";

export const Route = createFileRoute("/propostas")({ component: PropostasPage });
