import { Injectable } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import * as msal from '@azure/msal-node';

@Injectable()
export class OutlookService {
  private client: Client;
  private msalClient: msal.ConfidentialClientApplication;

  constructor() {
    this.msalClient = new msal.ConfidentialClientApplication({
      auth: {
        clientId: process.env.OUTLOOK_CLIENT_ID,
        authority: 'https://login.microsoftonline.com/common',
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
      }
    });
    this.client = Client.initWithMiddleware({   
      authProvider: {
        getAccessToken: async () => {
          const tokenRequest = {
            scopes: ['https://graph.microsoft.com/.default'],
          };
          const authResponse = await this.msalClient.acquireTokenByClientCredential(tokenRequest);
          return authResponse.accessToken;
        }
      }
    });
  }

  async fetchEmails(): Promise<any[]> {
    const response = await this.client.api('/me/messages').top(10).get();
    return response.value;
  }

  async getEmailContent(messageId: string): Promise<string> {
    const response = await this.client.api(`/me/messages/${messageId}`).get();
    return response.body.content;
  }

  async sendReply(messageId: string, replyText: string): Promise<void> {
    const message = await this.client.api(`/me/messages/${messageId}`).get();
    const reply = {
      message: {
        subject: `Re: ${message.subject}`,
        body: {
          contentType: 'Text',
          content: replyText,
        },
        toRecipients: message.toRecipients,
      },
      comment: '',
    };
    await this.client.api(`/me/messages/${messageId}/reply`).post(reply);
  }
}
