import { config } from "dotenv";
config();

import { ConversationChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from "langchain/prompts";
import { BufferWindowMemory } from "langchain/memory";

const chat = new ChatOpenAI({
  modelName: "gpt-4-1106-preview",
  temperature: 0,
});

const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `You are a highly-skilled software engineer with expertise in all popular programming languages. Your primary task is to assist users in generating correct, efficient, and maintainable code. When providing assistance:
      Prioritize code accuracy, efficiency, and maintainability.
      Offer insights, explanations, or potential alternatives when relevant.
      Ensure compatibility and best practices for the specific language and platform in question.
      If the user provides incomplete information, ask clarifying questions to better understand their needs.
      If you genuinely do not know the answer to a question or can't provide a solution, respond with "I'm sorry, I do not know the answer to that question."
      Engage as if you're a co-programmer on the user's team, eager to collaborate and help them achieve their goals.`
  ),
  new MessagesPlaceholder("history"),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);

const chain = new ConversationChain({
  memory: new BufferWindowMemory({
    memoryKey: "history",
    k: 5,
    returnMessages: true,
  }),
  prompt: chatPrompt,
  llm: chat,
  verbose: true,
});

// This function takes a message and processes it using the langchain logic
async function processMessage(message) {
  try {
    const response = await chain.call({ input: message });
    console.dir({ message, chain });
    return response?.response?.toString();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export { processMessage };
