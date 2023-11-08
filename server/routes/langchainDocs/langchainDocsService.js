import { config } from "dotenv";
config();

import { compile } from "html-to-text";
import { RecursiveUrlLoader } from "langchain/document_loaders/web/recursive_url";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { InMemoryDocstore } from "langchain/stores/doc/in_memory";
import { BufferWindowMemory } from "langchain/memory";
import { ParentDocumentRetriever } from "langchain/retrievers/parent_document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ConversationalRetrievalQAChain } from "langchain/chains";

const vectorstore = new MemoryVectorStore(new OpenAIEmbeddings());
const docstore = new InMemoryDocstore();
const retriever = new ParentDocumentRetriever({
  vectorstore,
  docstore,
  parentSplitter: new RecursiveCharacterTextSplitter({
    chunkOverlap: 50,
    chunkSize: 2000,
    separators: [
      "<h1>",
      "<h2>",
      "<h3>",
      "<h4>",
      "<h5>",
      "<h6>",
      "\n\n",
      "\n",
      " ",
      "",
    ],
  }),
  childSplitter: new RecursiveCharacterTextSplitter({
    chunkOverlap: 0,
    chunkSize: 50,
  }),
  // Optional `k` parameter to search for more child documents in VectorStore.
  // Note that this does not exactly correspond to the number of final (parent) documents
  // retrieved, as multiple child documents can point to the same parent.
  childK: 20,
  // Optional `k` parameter to limit number of final, parent documents returned from this
  // retriever and sent to LLM. This is an upper-bound, and the final count may be lower than this.
  parentK: 4, // 4 X 2000 = 8000 tokens which is the context length of gpt-4
});

const url = "https://js.langchain.com/docs/get_started/introduction";

const compiledConvert = compile({
  baseElements: { selectors: ["article"] },
  selectors: [
    {
      selector: "code",
      format: "inlineSurround",
      options: { prefix: "\n```javascript\n", suffix: "\n```\n" },
    },
    { selector: "h1", format: "inlineTag" },
    { selector: "h2", format: "inlineTag" },
    { selector: "h3", format: "inlineTag" },
    { selector: "h4", format: "inlineTag" },
    { selector: "h5", format: "inlineTag" },
    { selector: "h6", format: "inlineTag" },
    { selector: "a", options: { ignoreHref: true } },
  ],
});

const excludeDirs = ["https://js.langchain.com/docs/api/"];

const loader = new RecursiveUrlLoader(url, {
  extractor: compiledConvert,
  maxDepth: 10,
  excludeDirs: excludeDirs,
});

loader.load().then((docs) => {
  // workaround for bug [https://github.com/hwchase17/langchainjs/issues/2490]
  const filteredDocs = docs.filter(
    (doc) => !excludeDirs.some((dir) => doc.metadata.source.startsWith(dir))
  );
  retriever.addDocuments(filteredDocs).then(() => {
    console.log(`${filteredDocs.length} Documents now Loaded!`);
  });
});

const memory = new BufferWindowMemory({
  memoryKey: "chat_history",
  k: 5,
  returnMessages: true,
});

const chat = new ChatOpenAI({
  modelName: "gpt-4-1106-preview",
  temperature: 0,
});
const chain = ConversationalRetrievalQAChain.fromLLM(model, retriever, {
  memory,
});

async function processMessage(message) {
  try {
    const response = await chain.call({
      question: message,
    });
    return response?.text?.toString();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export { processMessage };
