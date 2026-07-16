/**
* Power Pages Server Logic
*
* Quick References:
* - Server.Logger → diagnostics logging
*   Example: Server.Logger.Log("message")
*   Example: Server.Logger.Error("error message")
*
* - Server.Context → query params, headers, body
*   Example: Server.Context.QueryParameters["id"], Server.Context.Headers["Authorization"], Server.Context.Body
*
* - Server.Connector.HttpClient → external API calls
*   Example: await Server.Connector.HttpClient.GetAsync("<URL>/1", {"Content-Type":"application/json"});
*   Example: await Server.Connector.HttpClient.PostAsync("<URL>", "{"name":"New Object"}", {"Authorization": "Bearer "},"application/json");
*   Example: await Server.Connector.HttpClient.PatchAsync("<URL>/1", "{"capacity":"1 TB"}", {"Authorization": "Bearer "},"application/json");
*   Example: await Server.Connector.HttpClient.DeleteAsync("<URL>/1", {"Authorization": "Bearer "},"application/json");
*
* - Server.Connector.Dataverse → CRUD in Dataverse & CustomApi
*   Example: Server.Connector.Dataverse.CreateRecord("accounts", "{"name":"Contoso Ltd."}");
*   Example: Server.Connector.Dataverse.RetrieveRecord("accounts", "accountid-guid", "$select=name,telephone1");
*   Example: Server.Connector.Dataverse.UpdateRecord("accounts", "accountid-guid", "{"telephone1":"123-456-7890"}");
*   Example: Server.Connector.Dataverse.DeleteRecord("accounts", "accountid-guid");
*   Example: Server.Connector.Dataverse.InvokeCustomApi("new_CustomApiName", "{"ParameterName":"value"}");
*
* - Server.User → signed-in user info
*   Example: Server.User.fullname, Server.User.Roles
*
* Full details: see https://go.microsoft.com/fwlink/?linkid=2334908
*/
 
function get() {
    try {
 
        if (!Server.Context.QueryParameters["id"]) {
            const errorMsg = "Missing required query parameter: id";
            Server.Logger.Error(errorMsg);
            return JSON.stringify({ status: "error", method: "GET", message: errorMsg });
        }
 
        Server.Logger.Log("GET called"); // Logger reference
        const id = Server.Context.QueryParameters["id"]; // Context reference
 
        // 🔹 Quick HttpClient GET example
        // const response = await Server.Connector.HttpClient.GetAsync("https://api.nuget.org/v3/index.json", {"Content-Type":"application/json"});
        // return JSON.parse(response.Body);
 
 
        return JSON.stringify({ status: "success", method: "GET", id: id });
    } catch (err) {
        Server.Logger.Error("GET failed: " + err.message);
        return JSON.stringify({ status: "error", method: "GET", message: err.message });
    }
}
 
 
async function post() {
    try {
        Server.Logger.Log("web-scrapper server logic invoked.");
        
        // 1. Extract raw vehicle data from the incoming SPA request body
        const requestBody = JSON.parse(Server.Context.Body);
        const make = requestBody.make;
        const model = requestBody.model;
        const trim = requestBody.trim;
        const year = requestBody.year;

        if (!make || !model || !year) {
            return JSON.stringify({ success: false, error: "Missing required parameters: make, model, or year." });
        }

        // 2. Target Power Automate Endpoint URL
        const FLOW_3_URL = "https://15c7cf15bfa4e984a64eef99a12de7.cd.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/17/workflows/78d508a5400a40b18f89343b6cf2f4c5/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=i4Ywt7OqT_X0TYi3VxPhGXZPl1cFmdwrNU_F46bUSjQ";

        // 3. Assemble clean payload for Flow 3
        const flowPayload = JSON.stringify({
            make: make,
            model: model,
            trim: trim,
            year: year
        });

        Server.Logger.Log("Forwarding request to Flow 3 cleanly via server HttpClient.");

        // 4. Fire clean server-to-server request (NO client-side session/authorization headers attached)
        const response = await Server.Connector.HttpClient.PostAsync(
            FLOW_3_URL, 
            flowPayload, 
            {}, // Empty headers dictionary ensures no clashing Authorization keys are passed
            "application/json"
        );

        // 5. Pass the parsed scrape data back to your client SPA
        return response.Body;

    } catch (err) {
        Server.Logger.Error("Web-scrapper processing exception: " + err.message);
        return JSON.stringify({ success: false, error: err.message });
    }
}
 
 
function put() {
    try {
        Server.Logger.Log("PUT called");
        const id = Server.Context.QueryParameters["id"];
        const data = Server.Context.Body;
 
        // 🔹 Quick Dataverse Update example
        // var response = Server.Connector.Dataverse.UpdateRecord("accounts", id, data);
 
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
 
        // 🔹 Quick HttpClient PATCH example
        // await Server.Connector.HttpClient.PatchAsync("<URL>" + id, JSON.stringify({ capacity: "1 TB" }), {"Authorization": "Bearer "},"application/json");
 
        return JSON.stringify({ status: "success", method: "PATCH", id: id, data: data });
    } catch (err) {
        Server.Logger.Error("PATCH failed: " + err.message);
        return JSON.stringify({ status: "error", method: "PATCH", message: err.message });
    }
}
 
 
function del() {
    try {
        // "delete" keyword should not be used in script file.
        Server.Logger.Log("DEL called");
        const id = Server.Context.QueryParameters["id"];
 
        // 🔹 Quick Dataverse Del example
        // var response = Server.Connector.Dataverse.DeleteRecord("accounts", id);
 
        return JSON.stringify({ status: "success", method: "DEL", id: id });
    } catch (err) {
        Server.Logger.Error("Deletion failed: " + err.message);
        return JSON.stringify({ status: "error", method: "DEL", message: err.message });
    }
}
 