import { config } from "dotenv";
config();

// import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
// import { ConversationChain } from "langchain/chains";
// import { ChatOpenAI } from "langchain/chat_models/openai";
// import {
//   ChatPromptTemplate,
//   HumanMessagePromptTemplate,
//   SystemMessagePromptTemplate,
//   MessagesPlaceholder,
// } from "langchain/prompts";
// import { BufferWindowMemory } from "langchain/memory";

// const chat = new ChatOpenAI({ modelName: "gpt-4", temperature: 0 });

// const chatPrompt = ChatPromptTemplate.fromPromptMessages([
//   SystemMessagePromptTemplate.fromTemplate(
//     `You are a highly-skilled software engineer with expertise in all popular programming languages. Your primary task is to assist users in generating correct, efficient, and maintainable code. When providing assistance:
//       Prioritize code accuracy, efficiency, and maintainability.
//       Offer insights, explanations, or potential alternatives when relevant.
//       Ensure compatibility and best practices for the specific language and platform in question.
//       If the user provides incomplete information, ask clarifying questions to better understand their needs.
//       If you genuinely do not know the answer to a question or can't provide a solution, respond with "I'm sorry, I do not know the answer to that question."
//       Engage as if you're a co-programmer on the user's team, eager to collaborate and help them achieve their goals.`
//   ),
//   new MessagesPlaceholder("history"),
//   HumanMessagePromptTemplate.fromTemplate("{input}"),
// ]);

// const chain = new ConversationChain({
//   memory: new BufferWindowMemory({
//     memoryKey: "history",
//     k: 5,
//     returnMessages: true,
//   }),
//   prompt: chatPrompt,
//   llm: chat,
//   verbose: true,
// });

// // This function takes a message and processes it using the langchain logic
// async function processMessage(message) {
//   try {
//     const response = await chain.call({ input: message });
//     console.dir({ message, chain });
//     return response?.response?.toString();
//   } catch (error) {
//     console.error(error);
//     return null;
//   }
// }

// import axios from "axios";
// import { Readability } from "@mozilla/readability";
// import { JSDOM } from "jsdom";
// import { config as dotenvConfig } from "dotenv";
// import { OpenAI as OpenAIModel } from "langchain/llms/openai";
// import { PromptTemplate } from "langchain/prompts";
// import { LLMChain as LLMChainModel } from "langchain/chains";

// dotenvConfig();

// // Function to parse a website article
// const parseWebArticle = async (htmlData) => {
//   const documentModel = new JSDOM(htmlData);
//   const readabilityInstance = new Readability(documentModel.window.document);
//   const parsedArticle = readabilityInstance.parse();

//   return parsedArticle;
// };

// // Function to scrape a website
// const scrapeWebsiteForArticle = async (websiteUrl) => {
//   try {
//     const { data: htmlData } = await axios.get(websiteUrl);
//     const parsedArticle = await parseWebArticle(htmlData);
//     return parsedArticle;
//   } catch (scrapeError) {
//     console.error(
//       `Failed to scrape data from ${websiteUrl} due to ${scrapeError}`
//     );
//     return null;
//   }
// };

// // Verify if URL is provided
// const providedUrl = process.argv[2];
// if (!providedUrl) {
//   console.error("Please provide a website URL");
//   process.exit(1);
// }

// // OpenAI model instance
// const openAIModelInstance = new OpenAIModel({ temperature: 0 });
// const summaryPromptTemplate = `
// You are an advanced AI assistant that summarizes online articles into bulleted lists
// Here's the article you need to summarize.
// ==================
// Title: {articleTitle}
// {articleText}
// ==================
// Now, provide a summarized version of the article in a bulleted list format.
// `;
// const formattedPrompt = new PromptTemplate({
//   template: summaryPromptTemplate,
//   inputVariables: ["articleTitle", "articleText"],
// });

// // Model chain instance
// const modelChainInstance = new LLMChainModel({
//   llm: openAIModelInstance,
//   prompt: formattedPrompt,
// });

// // Scrape and summarize the article
// const scrapedArticle = await scrapeWebsiteForArticle(providedUrl);
// const summarizedArticle = await modelChainInstance.call({
//   articleTitle: scrapedArticle.title,
//   articleText: scrapedArticle.content,
// });

// console.log(summarizedArticle);

// async function processMessage(message) {
//   try {
//     const response = await chain.call({ input: message });
//     console.dir({ message, chain });
//     return response?.response?.toString();
//   } catch (error) {
//     console.error(error);
//     return null;
//   }
// }

// export { processMessage };
import { FaissStore } from "langchain/vectorstores/faiss";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

import { compile } from "html-to-text";
import { RecursiveUrlLoader } from "langchain/document_loaders/web/recursive_url";

const url = "https://js.langchain.com/docs/get_started/introduction";

const compiledConvert = compile({ wordwrap: 130 }); // returns (text: string) => string;

const loader = new RecursiveUrlLoader(url, {
  extractor: compiledConvert,
  maxDepth: 1,
  excludeDirs: ["https://js.langchain.com/docs/api/"],
});

const docs = await loader.load();

const vectorStore = await FaissStore.fromDocuments(
  docs,
  new OpenAIEmbeddings()
);

async function processMessage(message) {
  try {
    const response = await vectorStore.similaritySearch(message, 1);
    console.dir({ message, response });
    return response?.response?.toString();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export { processMessage };
