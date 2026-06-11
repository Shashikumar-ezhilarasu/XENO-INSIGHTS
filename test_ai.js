"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var generative_ai_1 = require("@google/generative-ai");
var dotenv = require("dotenv");
dotenv.config({ path: 'backend/.env' });
var apiKey = process.env.GEMINI_API_KEY || '';
var genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var prompt_1, model;
        return __generator(this, function (_a) {
            try {
                prompt_1 = "You are the core XENO Marketing AI Agent. You are talking to a marketer.\nThey want to brainstorm and execute a campaign. \nIf they just give a broad goal, ask clarifying questions to narrow down the target audience, incentive, and channel (SMS, Email, WhatsApp, RCS).\nOnce you have enough context or if their initial prompt is detailed enough, PROPOSE a campaign.\nWhen you propose a campaign, fill out the \"proposedCampaign\" object in the JSON response. If you are just chatting and not ready to propose, leave \"proposedCampaign\" null.\nMake sure your \"agentReply\" is conversational, encouraging, and helpful.\n\nHere is the conversation history:\nUSER: Find customers who haven't ordered in the last 90 days but have a high discount preference.\" (To test the data segmentation\n\nBased on the LAST message from the USER, generate your response.";
                model = genAI.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: generative_ai_1.SchemaType.OBJECT,
                            properties: {
                                agentReply: {
                                    type: generative_ai_1.SchemaType.STRING,
                                    description: 'Your conversational reply to the marketer.'
                                },
                                proposedCampaign: {
                                    type: generative_ai_1.SchemaType.OBJECT,
                                    description: 'Populate this ONLY if you are proposing a concrete campaign to be executed. Leave null otherwise.',
                                    nullable: true,
                                    properties: {
                                        name: { type: generative_ai_1.SchemaType.STRING, description: 'Catchy internal campaign name' },
                                        targetSegment: { type: generative_ai_1.SchemaType.STRING, description: 'Natural language description of the target audience (e.g. "Coffee lovers who haven\\', t: t, bought: bought, 30: days, ")' },: channel }
                                    }
                                }
                            }
                        }
                    }
                }, { type: generative_ai_1.SchemaType.STRING, description: 'WHATSAPP, EMAIL, SMS, or RCS' }, messageCopy, { type: generative_ai_1.SchemaType.STRING, description: 'The exact drafted message to be sent.' }, incentive, { type: generative_ai_1.SchemaType.STRING, description: 'The incentive offered (e.g. "20% off", "Flat $10")' });
            }
            finally { }
            required: ['name', 'targetSegment', 'channel', 'messageCopy', 'incentive'];
            return [2 /*return*/];
        });
    });
}
required: ['agentReply'];
;
var result = await model.generateContent(prompt);
var responseText = result.response.text();
console.log("RAW TEXT:", responseText);
responseText = responseText.replace(/```json\n?|```/g, '').trim();
console.log("PARSED:", JSON.parse(responseText));
try { }
catch (error) {
    console.error('Systemic error:', error);
}
run();
