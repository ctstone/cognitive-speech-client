import request = require('request');
import async = require('async');

type RequestAPI = request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;
const EXPIRES = 600; // 10 minutes

export type SpeechAuthCallback = (err: Error, token: string) => void;

export class SpeechAuthClient {
  private request: RequestAPI;
  private token: string;
  private requesting: boolean;
  private expiresAt: Date;
  private queue: SpeechAuthCallback[] = [];
  private renewTimer: NodeJS.Timer;

  constructor(key: string, region: string = null, autorenew = false) {
    region = region ? `${region}.` : '';
    this.request = request.defaults({
      baseUrl: `https://${region}api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      headers: { 'Ocp-Apim-Subscription-Key': key },
    });

    if (autorenew) {
      this.startAutoRenew(EXPIRES * 0.9 * 1000);
    }
  }

  getToken(callback: SpeechAuthCallback): void {
    const now = new Date();

    if (this.token && now < this.expiresAt) {
      setImmediate(callback, null, this.token);
      return;
    } else if (this.requesting) {
      this.queue.push(callback);
      return;
    }

    this.requesting = true;

    async.waterfall([
      (next: request.RequestCallback) => {
        this.requestToken(next);
      },
      (resp: request.RequestResponse, body: any, next: SpeechAuthCallback) => {
        this.receiveToken(resp, body, next);
      },
    ], callback);
  }

  startAutoRenew(delay: number): void {
    if (!this.renewTimer) {
      this.renewTimer = setInterval(() => this.getToken(() => null), delay);
    }
  }

  stopAutorewnew(): void {
    if (this.renewTimer) {
      clearInterval(this.renewTimer);
    }
  }

  private requestToken(callback: request.RequestCallback): void {
    this.request.post('', callback);
  }

  private receiveToken(resp: request.RequestResponse, body: any, callback: SpeechAuthCallback): void {
    this.requesting = false;
    if (resp.statusCode !== 200) {
      setImmediate(callback, new Error(`Auth returned HTTP ${resp.statusCode}`));
    } else if (!body) {
      setImmediate(callback, new Error('Response is missing access_token'));
    } else {
      this.token = body;
      this.expiresAt = new Date();
      this.expiresAt.setSeconds(this.expiresAt.getSeconds() + EXPIRES);

      this.queue.splice(0, 0, callback);
      this.queue.forEach((x) => setImmediate(x, null, this.token));
      this.queue.length = 0;
    }
  }
}
