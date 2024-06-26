import { Module } from '@nestjs/common';
import { ServiceController } from './service.controller';
import { GmailService } from './gmail.service';
import { OpenAIService } from './openai.service';
import { OutlookService } from './outlook.service';
import { EmailQueueConsumer } from './email.queue';

@Module({
  controllers: [ServiceController],
  providers:[GmailService,OpenAIService,OutlookService,EmailQueueConsumer]
})
export class ServiceModule {}
