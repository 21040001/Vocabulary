export type QuizResult={wordId:string;isCorrect:boolean};
export type QuizSession={words:string[];currentIndex:number;correctCount:number;wrongCount:number;results:QuizResult[]};
