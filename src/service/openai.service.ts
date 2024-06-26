import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: "shdhjsdkjsdjsdb",
    });
  }

  async generateReply(prompt: string): Promise<string> {
    const response = await this.openai.completions.create({
      model: 'text-davinci-002',
      prompt,
      max_tokens: 150,
    });
    return response.choices[0].text.trim();
  }
}
