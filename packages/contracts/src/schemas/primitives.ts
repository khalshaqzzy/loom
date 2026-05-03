import { z } from "zod";
import { MAX_NODE_ID, ROUTE_INFINITY } from "../constants";

export const nodeIdNumericSchema = z.number().int().min(0).max(MAX_NODE_ID);

export const seqIdSchema = z.number().int().min(0).max(4_294_967_295);

export const routeRangeSchema = z.number().int().min(0).max(ROUTE_INFINITY);

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const birthDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Birth date must use YYYY-MM-DD."
});

export const ownerFullNameSchema = z.string().trim().min(2).max(160);

export const latitudeSchema = z.number().min(-90).max(90);
export const longitudeSchema = z.number().min(-180).max(180);
export const latE6Schema = z.number().int().min(-90_000_000).max(90_000_000);
export const lonE6Schema = z.number().int().min(-180_000_000).max(180_000_000);

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional()
});
