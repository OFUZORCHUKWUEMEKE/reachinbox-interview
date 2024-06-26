import { Controller, Get, Param } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { OutlookService } from './outlook.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ApiTags } from '@nestjs/swagger';

@ApiTags("service")
@Controller('service')
export class ServiceController {
    constructor(
        private readonly gmailService: GmailService,
        private readonly outlookService: OutlookService,
        @InjectQueue('emailQueue') private readonly emailQueue: Queue,
      ) {}
    
      @Get('reply-emails/:service')
      async replyEmails(@Param('service') service: string): Promise<void> {
        let emails = [];
        if (service === 'gmail') {
          await this.gmailService.authenticate();
          emails = await this.gmailService.fetchEmails();
        } else if (service === 'outlook') {
          emails = await this.outlookService.fetchEmails();
        }
    
        for (const email of emails) {
          await this.emailQueue.add('sendEmail', { service, emailId: email.id });
        }
      }
    
      @Get('reply-email/:service/:emailId')
      async replySingleEmail(
        @Param('service') service: string,
        @Param('emailId') emailId: string,
      ): Promise<void> {
        await this.emailQueue.add('sendEmail', { service, emailId });
      }
}
