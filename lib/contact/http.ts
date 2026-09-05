export type ContactPayload = {
  phone: string;
  email: string;
  address: string;
};

export type ContactGetSuccessBody = {
  contact: ContactPayload | null;
};

export type ContactGetErrorBody = {
  error: string;
};

export type PublicContactGetDependencies = {
  readContact: () => Promise<ContactPayload | null>;
};

export type AdminContactGetDependencies = PublicContactGetDependencies & {
  requireAdmin: () => boolean | Promise<boolean>;
};

const CACHE_CONTROL_NO_STORE = "no-store";
const READ_ERROR_MESSAGE = "Impossible de recuperer les donnees Contact.";
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

function contactSuccessBody(
  contact: ContactPayload | null,
): ContactGetSuccessBody {
  return {
    contact:
      contact === null
        ? null
        : {
            phone: contact.phone,
            email: contact.email,
            address: contact.address,
          },
  };
}

/**
 * Shared GET serialization for public and admin contact reads.
 * No KV or session imports — callers inject read/auth.
 */
async function handleGetContactRead(
  readContact: () => Promise<ContactPayload | null>,
): Promise<Response> {
  try {
    const contact = await readContact();
    return jsonResponse(200, contactSuccessBody(contact));
  } catch {
    return jsonResponse(500, { error: READ_ERROR_MESSAGE } satisfies ContactGetErrorBody);
  }
}

export async function handleGetPublicContact(
  dependencies: PublicContactGetDependencies,
): Promise<Response> {
  return handleGetContactRead(dependencies.readContact);
}

export async function handleGetAdminContact(
  dependencies: AdminContactGetDependencies,
): Promise<Response> {
  let isAdmin: boolean;
  try {
    isAdmin = await dependencies.requireAdmin();
  } catch {
    return jsonResponse(500, { error: READ_ERROR_MESSAGE } satisfies ContactGetErrorBody);
  }

  if (!isAdmin) {
    return jsonResponse(401, {
      error: UNAUTHORIZED_MESSAGE,
    } satisfies ContactGetErrorBody);
  }

  return handleGetContactRead(dependencies.readContact);
}
