/**
 * 考试界面页面
 * 模拟考试播放器，支持计时和自动评分
 */

import type { Metadata } from 'next';

// 动态页面元数据
export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return {
    title: '模拟考试',
    description: `参加考试 ID: ${params.id}`,
  };
}

// 模拟考试数据
const examData = {
  id: '1',
  title: '机器学习基础测试',
  description: '基于"机器学习基础"文档生成的综合测试',
  timeLimit: 45, // 分钟
  totalQuestions: 10,
  currentQuestion: 1,
  questions: [
    {
      id: 'q1',
      type: 'multiple-choice',
      question: '监督学习的主要特征是什么？',
      options: [
        'A) 不需要训练数据',
        'B) 使用标记的训练数据',
        'C) 只能处理数值数据',
        'D) 不需要输出标签'
      ],
      correctAnswer: 'B',
      explanation: '监督学习的核心特征是使用带有正确答案标签的训练数据来训练算法。',
      sourceSegments: ['seg_2'],
      difficulty: 'medium',
      points: 10,
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      question: '监督学习算法的主要目标是什么？',
      options: [
        'A) 减少数据量',
        'B) 学习输入到输出的映射函数',
        'C) 增加数据复杂性',
        'D) 删除异常值'
      ],
      correctAnswer: 'B',
      explanation: '监督学习的目标是学习一个能够将新输入映射到正确输出的函数。',
      sourceSegments: ['seg_2'],
      difficulty: 'medium',
      points: 10,
    },
    {
      id: 'q3',
      type: 'true-false',
      question: '无监督学习需要使用标记的训练数据。',
      correctAnswer: false,
      explanation: '无监督学习的特点是不使用标记数据，而是在数据中寻找隐藏的模式。',
      sourceSegments: ['seg_3'],
      difficulty: 'easy',
      points: 5,
    },
    {
      id: 'q4',
      type: 'short-answer',
      question: '请简要说明聚类在无监督学习中的作用。',
      sampleAnswer: '聚类是无监督学习的常见应用，用于将相似的数据点分组，发现数据中的隐藏结构和模式。',
      sourceSegments: ['seg_3'],
      difficulty: 'hard',
      points: 15,
    },
  ],
};

// 用户答案状态
const userAnswers = {
  q1: 'B',
  q2: '',
  q3: null,
  q4: '',
};

// 题目类型配置
const questionTypeConfig = {
  'multiple-choice': { icon: '📝', name: '选择题' },
  'true-false': { icon: '✓✗', name: '判断题' },
  'short-answer': { icon: '📄', name: '简答题' },
};

// 难度配置
const difficultyConfig = {
  easy: { color: 'text-green-600', text: '简单' },
  medium: { color: 'text-yellow-600', text: '中等' },
  hard: { color: 'text-red-600', text: '困难' },
};

// 选择题组件
const MultipleChoiceQuestion = ({ 
  question, 
  userAnswer, 
  onAnswerChange 
}: { 
  question: typeof examData.questions[0];
  userAnswer: string;
  onAnswerChange: (answer: string) => void;
}) => (
  <div className="space-y-4">
    <div className="space-y-3">
      {question.options?.map((option, index) => (
        <label 
          key={index}
          className={`flex items-center p-4 border rounded cursor-pointer transition-all ${
            userAnswer === option[0] 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name={`question-${question.id}`}
            value={option[0]}
            checked={userAnswer === option[0]}
            onChange={(e) => onAnswerChange(e.target.value)}
            className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300"
          />
          <span className="ml-3 text-gray-900">{option}</span>
        </label>
      ))}
    </div>
  </div>
);

// 判断题组件
const TrueFalseQuestion = ({ 
  question, 
  userAnswer, 
  onAnswerChange 
}: { 
  question: typeof examData.questions[0];
  userAnswer: boolean | null;
  onAnswerChange: (answer: boolean) => void;
}) => (
  <div className="space-y-4">
    <div className="flex space-x-6">
      <label className={`flex items-center p-4 border rounded cursor-pointer transition-all ${
        userAnswer === true 
          ? 'border-green-500 bg-green-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}>
        <input
          type="radio"
          name={`question-${question.id}`}
          checked={userAnswer === true}
          onChange={() => onAnswerChange(true)}
          className="h-4 w-4 text-green-500 focus:ring-green-500"
        />
        <span className="ml-3 text-gray-900">正确</span>
      </label>
      <label className={`flex items-center p-4 border rounded cursor-pointer transition-all ${
        userAnswer === false 
          ? 'border-green-500 bg-green-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}>
        <input
          type="radio"
          name={`question-${question.id}`}
          checked={userAnswer === false}
          onChange={() => onAnswerChange(false)}
          className="h-4 w-4 text-green-500 focus:ring-green-500"
        />
        <span className="ml-3 text-gray-900">错误</span>
      </label>
    </div>
  </div>
);

// 简答题组件
const ShortAnswerQuestion = ({ 
  question, 
  userAnswer, 
  onAnswerChange 
}: { 
  question: typeof examData.questions[0];
  userAnswer: string;
  onAnswerChange: (answer: string) => void;
}) => (
  <div className="space-y-4">
    <textarea
      placeholder="请输入您的答案..."
      value={userAnswer}
      onChange={(e) => onAnswerChange(e.target.value)}
      rows={6}
      className="w-full p-4 border border-gray-200 rounded focus:outline-none focus:border-green-500 resize-none"
    />
    <div className="text-sm text-gray-500">
      建议答案长度: 50-200字
    </div>
  </div>
);

// 考试进度组件
const ExamProgress = ({ 
  current, 
  total, 
  timeRemaining 
}: { 
  current: number; 
  total: number; 
  timeRemaining: number;
}) => {
  const progressPercentage = (current / total) * 100;
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            题目 {current} / {total}
          </span>
          <div className="w-48 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-lg font-mono">
            {hours > 0 && `${hours.toString().padStart(2, '0')}:`}
            {minutes.toString().padStart(2, '0')}:
            {seconds.toString().padStart(2, '0')}
          </div>
          <div className={`text-sm ${
            timeRemaining < 300 ? 'text-red-600' : 'text-gray-600'
          }`}>
            剩余时间
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ExamPage({ params }: { params: { id: string } }) {
  const currentQuestion = examData.questions[examData.currentQuestion - 1];
  const questionType = questionTypeConfig[currentQuestion.type as keyof typeof questionTypeConfig];
  const difficulty = difficultyConfig[currentQuestion.difficulty as keyof typeof difficultyConfig];
  const timeRemaining = 2580; // 43分钟剩余时间（秒）

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 考试标题 */}
        <div className="mb-8">
          <div className="text-xs font-mono text-gray-400 mb-2 tracking-wider">
            MOCK EXAM
          </div>
          <h1 className="text-2xl font-light text-black mb-2">
            {examData.title}
          </h1>
          <p className="text-gray-600">
            {examData.description}
          </p>
        </div>

        {/* 考试进度 */}
        <ExamProgress 
          current={examData.currentQuestion}
          total={examData.totalQuestions}
          timeRemaining={timeRemaining}
        />

        {/* 题目区域 */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-lg">{questionType.icon}</span>
              <span className="text-sm text-gray-600">{questionType.name}</span>
              <span className={`text-sm ${difficulty.color}`}>{difficulty.text}</span>
              <span className="text-sm text-gray-600">{currentQuestion.points} 分</span>
            </div>
            <div className="text-sm text-gray-500">
              题目 {examData.currentQuestion}/{examData.totalQuestions}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl text-gray-900 mb-6 leading-relaxed">
              {currentQuestion.question}
            </h2>

            {/* 根据题目类型渲染不同的组件 */}
            {currentQuestion.type === 'multiple-choice' && (
              <MultipleChoiceQuestion
                question={currentQuestion}
                userAnswer={userAnswers[currentQuestion.id as keyof typeof userAnswers] as string}
                onAnswerChange={(answer) => console.log('Answer:', answer)}
              />
            )}
            
            {currentQuestion.type === 'true-false' && (
              <TrueFalseQuestion
                question={currentQuestion}
                userAnswer={userAnswers[currentQuestion.id as keyof typeof userAnswers] as boolean}
                onAnswerChange={(answer) => console.log('Answer:', answer)}
              />
            )}
            
            {currentQuestion.type === 'short-answer' && (
              <ShortAnswerQuestion
                question={currentQuestion}
                userAnswer={userAnswers[currentQuestion.id as keyof typeof userAnswers] as string}
                onAnswerChange={(answer) => console.log('Answer:', answer)}
              />
            )}
          </div>

          {/* 源信息 */}
          <div className="border-t pt-4">
            <div className="text-xs text-gray-500 mb-2">题目来源:</div>
            <div className="flex flex-wrap gap-2">
              {currentQuestion.sourceSegments.map((segId) => (
                <span 
                  key={segId}
                  className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
                >
                  {segId}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 导航按钮 */}
        <div className="flex items-center justify-between">
          <button 
            className="btn-secondary px-6 py-3"
            disabled={examData.currentQuestion === 1}
          >
            上一题
          </button>
          
          <div className="flex items-center space-x-4">
            <button className="text-gray-600 hover:text-gray-900 text-sm">
              标记题目
            </button>
            <button className="text-gray-600 hover:text-gray-900 text-sm">
              跳过
            </button>
          </div>

          {examData.currentQuestion < examData.totalQuestions ? (
            <button className="btn-primary px-6 py-3">
              下一题
            </button>
          ) : (
            <button className="bg-red-500 text-white px-6 py-3 hover:bg-red-600 transition-colors">
              提交考试
            </button>
          )}
        </div>

        {/* 题目导航 */}
        <div className="mt-12 border-t pt-8">
          <div className="text-sm text-gray-600 mb-4">快速导航:</div>
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: examData.totalQuestions }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                className={`w-8 h-8 text-xs rounded transition-colors ${
                  num === examData.currentQuestion
                    ? 'bg-green-500 text-white'
                    : userAnswers[`q${num}` as keyof typeof userAnswers]
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}