export type ConditioningPayload = {
  title: string;
  description: string;
};

export type ConditioningGetSuccessBody = {
  conditioning: ConditioningPayload | null;
};

export type ConditioningGetErrorBody = {
  error: string;
};

export type PublicConditioningGetDependencies = {
  readConditioning: () => Promise<ConditioningPayload | null>;
};

export type AdminConditioningGetDependencies = PublicConditioningGetDependencies & {
  requireAdmin: () => boolean | Promise<boolean>;
};

const CACHE_CONTROL_NO_STORE = "no-store";
const READ_ERROR_MESSAGE = "Impossible de recuperer les donnees Conditioning.";
const UNAUTHORIZED_MESSAGE = "Non autorise.";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": CACHE_CONTROL_NO_STORE,
    },
  });
}

function conditioningSuccessBody(
  conditioning: ConditioningPayload | null,
): ConditioningGetSuccessBody {
  return {
    conditioning:
      conditioning === null
        ? null
        : {
            title: conditioning.title,
            description: conditioning.description,
          },
  };
}

/**
 * Shared GET serialization for public and admin conditioning reads.
 * No KV or session imports — callers inject read/auth.
 */
async function handleGetConditioningRead(
  readConditioning: () => Promise<ConditioningPayload | null>,
): Promise<Response> {
  try {
    const conditioning = await readConditioning();
    return jsonResponse(200, conditioningSuccessBody(conditioning));
  } catch {
    return jsonResponse(500, {
      error: READ_ERROR_MESSAGE,
    } satisfies ConditioningGetErrorBody);
  }
}

export async function handleGetPublicConditioning(
  dependencies: PublicConditioningGetDependencies,
): Promise<Response> {
  return handleGetConditioningRead(dependencies.readConditioning);
}

export async function handleGetAdminConditioning(
  dependencies: AdminConditioningGetDependencies,
): Promise<Response> {
  let isAdmin: boolean;
  try {
    isAdmin = await dependencies.requireAdmin();
  } catch {
    return jsonResponse(500, {
      error: READ_ERROR_MESSAGE,
    } satisfies ConditioningGetErrorBody);
  }

  if (!isAdmin) {
    return jsonResponse(401, {
      error: UNAUTHORIZED_MESSAGE,
    } satisfies ConditioningGetErrorBody);
  }

  return handleGetConditioningRead(dependencies.readConditioning);
}
