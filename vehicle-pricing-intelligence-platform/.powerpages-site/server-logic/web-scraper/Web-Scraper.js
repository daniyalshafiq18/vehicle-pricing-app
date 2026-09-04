/**
 * Legacy Power Pages server-logic endpoint.
 *
 * DriveArabia scraping is dispatched by the Dataverse-triggered cloud flow.
 * This endpoint intentionally contains no signed Power Automate callback URL.
 */

function get() {
    try {
        if (!Server.Context.QueryParameters["id"]) {
            const errorMsg = "Missing required query parameter: id";
            Server.Logger.Error(errorMsg);
            return JSON.stringify({ status: "error", method: "GET", message: errorMsg });
        }

        Server.Logger.Log("GET called");
        const id = Server.Context.QueryParameters["id"];
        return JSON.stringify({ status: "success", method: "GET", id: id });
    } catch (err) {
        Server.Logger.Error("GET failed: " + err.message);
        return JSON.stringify({ status: "error", method: "GET", message: err.message });
    }
}

async function post() {
    const errorMessage =
        "The legacy Flow 3 bridge is retired. Use the Dataverse-triggered DriveArabia workflow.";
    Server.Logger.Error(errorMessage);
    return JSON.stringify({ success: false, error: errorMessage });
}

function put() {
    try {
        Server.Logger.Log("PUT called");
        const id = Server.Context.QueryParameters["id"];
        const data = Server.Context.Body;
        return JSON.stringify({ status: "success", method: "PUT", id: id, data: data });
    } catch (err) {
        Server.Logger.Error("PUT failed: " + err.message);
        return JSON.stringify({ status: "error", method: "PUT", message: err.message });
    }
}

async function patch() {
    try {
        Server.Logger.Log("PATCH called");
        const id = Server.Context.QueryParameters["id"];
        const data = Server.Context.Body;
        return JSON.stringify({ status: "success", method: "PATCH", id: id, data: data });
    } catch (err) {
        Server.Logger.Error("PATCH failed: " + err.message);
        return JSON.stringify({ status: "error", method: "PATCH", message: err.message });
    }
}

function del() {
    try {
        Server.Logger.Log("DEL called");
        const id = Server.Context.QueryParameters["id"];
        return JSON.stringify({ status: "success", method: "DEL", id: id });
    } catch (err) {
        Server.Logger.Error("Deletion failed: " + err.message);
        return JSON.stringify({ status: "error", method: "DEL", message: err.message });
    }
}
