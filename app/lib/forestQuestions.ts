export type MCQ = {
  id: number;
  question: string;
  choices: { A: string; B: string; C: string; D: string };
  answer: "A" | "B" | "C" | "D";
  hint: string;
};

export const QUESTIONS: MCQ[] = [
  {
    id: 1,
    question: "Which word is spelled correctly?",
    choices: { A: "frend", B: "freind", C: "friend", D: "freiend" },
    answer: "C",
    hint: "It has the letters I and E next to each other — I before E.",
  },
  {
    id: 2,
    question: "What does the word 'enormous' mean?",
    choices: { A: "Very tiny", B: "Very loud", C: "Very fast", D: "Very big" },
    answer: "D",
    hint: "Think of an elephant — that would be an enormous animal.",
  },
  {
    id: 3,
    question: "Which sentence uses the correct punctuation?",
    choices: {
      A: "Where are you going",
      B: "Where are you going?",
      C: "Where are you going!",
      D: "where are you going?",
    },
    answer: "B",
    hint: "It is a question, so it needs a question mark and a capital letter at the start.",
  },
  {
    id: 4,
    question: "Pick the word that rhymes with 'light'.",
    choices: { A: "list", B: "like", C: "night", D: "lift" },
    answer: "C",
    hint: "It ends with the same '-ight' sound.",
  },
  {
    id: 5,
    question: "Which word is the opposite of 'ancient'?",
    choices: { A: "Old", B: "Modern", C: "Large", D: "Quiet" },
    answer: "B",
    hint: "Ancient means very old, so the opposite means very new.",
  },
  {
    id: 6,
    question: "How many syllables are in the word 'butterfly'?",
    choices: { A: "One", B: "Two", C: "Three", D: "Four" },
    answer: "C",
    hint: "Try clapping it out: but-ter-fly.",
  },
  {
    id: 7,
    question: "Which word completes the sentence? 'The dog wagged ___ tail.'",
    choices: { A: "it's", B: "its", C: "its'", D: "itz" },
    answer: "B",
    hint: "When something belongs to it, we write 'its' with no apostrophe.",
  },
];
