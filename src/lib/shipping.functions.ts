import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { quoteForCep } from "./shipping.server";

export const quoteShipping = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        cep: z.string(),
        weight_g: z.number().int().positive().max(30000).default(500),
        subtotal: z.number().min(0).default(0),
      })
      .parse(data),
  )
  .handler(async ({ data }) => quoteForCep(data.cep, data.weight_g, data.subtotal));
