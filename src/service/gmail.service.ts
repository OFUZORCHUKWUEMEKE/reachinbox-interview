import { Injectable } from '@nestjs/common';
import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as readline from 'readline';

@Injectable()
export class GmailService {
  private oAuth2Client: OAuth2Client;

  constructor() {
    this.oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  async authenticate(): Promise<void> {
    const tokenPath = `token-${process.env.GOOGLE_ACCOUNT}.json`;
    if (fs.existsSync(tokenPath)) {
      const token = fs.readFileSync(tokenPath, 'utf8');
      this.oAuth2Client.setCredentials(JSON.parse(token));
    } else {
      await this.getNewToken(tokenPath);
    }
  }

  private async getNewToken(tokenPath: string): Promise<void> {
    const authUrl = this.oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/gmail.modify'] });
    console.log('Authorize this app by visiting this URL:', authUrl);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const code = await new Promise<string>((resolve) => {
      rl.question('Enter the code from that page here: ', resolve);
    });
    rl.close();

    const tokenResponse = await this.oAuth2Client.getToken(code);
    this.oAuth2Client.setCredentials(tokenResponse.tokens);
    fs.writeFileSync(tokenPath, JSON.stringify(tokenResponse.tokens));
    console.log('Token stored to', tokenPath);
  }

  async fetchEmails(): Promise<gmail_v1.Schema$Message[]> {
    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
    const res = await gmail.users.messages.list({ userId: 'me', labelIds: ['INBOX'], maxResults: 10 });
    return res.data.messages || [];
  }

  async getEmailContent(messageId: string): Promise<string> {
    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
    const res = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
    return res.data.snippet || '';
  }

  async sendReply(messageId: string, replyText: string): Promise<void> {
    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
    const message = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
    const threadId = message.data.threadId;

    const emailLines = [
      'From: me',
      'To: recipient@example.com',
      'Subject: Re: ' + message.data.payload?.headers?.find(header => header.name === 'Subject')?.value,
      '',
      replyText
    ];

    const rawMessage = Buffer.from(emailLines.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
        threadId: threadId
      }
    });
  }
}
