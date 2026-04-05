import { Client } from "@microsoft/microsoft-graph-client";
import { getMsalInstance, loginRequest } from "./msalConfig";

const msalInstance = getMsalInstance();

class OneNoteService {
    private client: Client | null = null;

    private async getAccessToken() {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0) {
            throw new Error("No accounts found. Please login first.");
        }

        try {
            const response = await msalInstance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0],
            });
            return response.accessToken;
        } catch (error) {
            console.error("Silent token acquisition failed, seeking interactive login", error);
            const response = await msalInstance.acquireTokenPopup(loginRequest);
            return response.accessToken;
        }
    }

    private async getClient() {
        if (!this.client) {
            const token = await this.getAccessToken();
            this.client = Client.init({
                authProvider: (done) => {
                    done(null, token);
                },
            });
        }
        return this.client;
    }

    async ensureNotebookAndSection() {
        const client = await this.getClient();
        
        // 1. Check if "My Personal Journal" notebook exists
        const notebooks = await client.api("/me/onenote/notebooks").filter("displayName eq 'My Personal Journal'").get();
        let notebookId = "";

        if (notebooks.value && notebooks.value.length > 0) {
            notebookId = notebooks.value[0].id;
        } else {
            // Create the dedicated notebook if it doesn't exist
            const newNotebook = await client.api("/me/onenote/notebooks").post({ displayName: "My Personal Journal" });
            notebookId = newNotebook.id;
        }

        // 2. Check if "Dashboard Journals" section already exists in THIS notebook
        const sections = await client.api(`/me/onenote/notebooks/${notebookId}/sections`).filter("displayName eq 'Dashboard Journals'").get();
        
        if (sections.value && sections.value.length > 0) {
            return sections.value[0].id;
        }

        // 3. Create the section in our dedicated notebook
        const newSection = await client.api(`/me/onenote/notebooks/${notebookId}/sections`).post({
            displayName: "Dashboard Journals"
        });

        return newSection.id;
    }

    async createOrUpdatePage(title: string, content: string) {
        const client = await this.getClient();
        const sectionId = await this.ensureNotebookAndSection();

        // Check if page with this title already exists in the section
        const existingPages = await client.api(`/me/onenote/sections/${sectionId}/pages`)
            .filter(`title eq '${title}'`)
            .select("id,links")
            .get();

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (existingPages.value && existingPages.value.length > 0) {
            // Page exists - APPEND to it
            const pageId = existingPages.value[0].id;
            
            // Construct PATCH command to append content
            const patchCommands = [
                {
                    target: "body",
                    action: "append",
                    position: "after",
                    content: `
                        <hr />
                        <h3 style="color: #0d9488; font-size: 14pt; margin-top: 20pt;">New Entry at ${timestamp}</h3>
                        ${content}
                    `
                }
            ];

            await client.api(`/me/onenote/pages/${pageId}/content`)
                .patch(patchCommands);

            return existingPages.value[0];
        } else {
            // Page doesn't exist - CREATE new
            const pageHtml = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>${title}</title>
                        <meta name="created" content="${new Date().toISOString()}" />
                    </head>
                    <body>
                        <h2 style="color: #0d9488; font-size: 18pt;">Daily Log: ${title.replace("Journal - ", "")}</h2>
                        <h3 style="color: #0d9488; font-size: 14pt; margin-top: 10pt;">Entry at ${timestamp}</h3>
                        ${content}
                    </body>
                </html>
            `;

            const response = await client.api(`/me/onenote/sections/${sectionId}/pages`)
                .header("Content-Type", "text/html")
                .post(pageHtml);

            return response;
        }
    }
}

export const onenoteService = new OneNoteService();
