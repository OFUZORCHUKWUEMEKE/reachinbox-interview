import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { OutlookService } from './outlook.service';
import { OpenAIService } from './openai.service';


@Injectable()
@Processor('emailQueue')
export class EmailQueueConsumer {
  private readonly logger = new Logger(EmailQueueConsumer.name);

  constructor(
    private readonly gmailService: GmailService,
    private readonly outlookService: OutlookService,
    private readonly openaiService: OpenAIService,
  ) {}

  @Process('sendEmail')
  async sendEmail(job: Job<{ service: string; emailId: string }>) {
    const { service, emailId } = job.data;

    let emailContent: string;
    if (service === 'gmail') {
      await this.gmailService.authenticate();
      emailContent = await this.gmailService.getEmailContent(emailId);
    } else if (service === 'outlook') {
      emailContent = await this.outlookService.getEmailContent(emailId);
    }

    const reply = await this.openaiService.generateReply(this.categorizeEmail(emailContent));

    if (service === 'gmail') {
      await this.gmailService.sendReply(emailId, reply);
    } else if (service === 'outlook') {
      await this.outlookService.sendReply(emailId, reply);
    }

    this.logger.log(`Processed email ${emailId} for ${service}`);
  }

  private categorizeEmail(content: string): string {
    if (content.includes('interested')) {
      return 'The user is interested. Please suggest a demo call and ask for suitable times.';
    } else if (content.includes('more information')) {
      return 'The user wants more information. Provide detailed information and ask for any specific queries.';
    } else {
      return 'The user is not interested. Acknowledge and offer further assistance if needed.';
    }
  }
}
