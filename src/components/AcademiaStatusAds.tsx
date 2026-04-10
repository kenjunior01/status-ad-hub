import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  GraduationCap, Camera, BarChart3, Palette, Target, Clock, CheckCircle2,
  BookOpen, Lightbulb, ArrowRight, Star, HelpCircle, Trophy, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Quiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: React.ReactNode;
  category: "creator" | "advertiser";
  difficulty: "iniciante" | "intermediário" | "avançado";
  tips: string[];
  quiz?: Quiz;
}

const lessons: Lesson[] = [
  {
    id: "1", title: "Como tirar fotos de Status perfeitas",
    description: "Aprenda técnicas de iluminação, composição e enquadramento para criar status que convertem.",
    duration: "5 min", icon: <Camera className="h-5 w-5" />, category: "creator", difficulty: "iniciante",
    tips: ["Use luz natural sempre que possível", "Mantenha o produto no centro da imagem", "Use fundo limpo e sem distrações", "Adicione texto curto e legível"],
    quiz: { question: "Qual é a melhor fonte de luz para fotos de Status?", options: ["Flash do celular", "Luz natural", "Luz fluorescente", "Sem iluminação"], correctIndex: 1, explanation: "A luz natural proporciona cores mais naturais e evita sombras duras, resultando em fotos mais profissionais." }
  },
  {
    id: "2", title: "Maximize seus ganhos por campanha",
    description: "Estratégias para aumentar seu CPV e conquistar campanhas premium.",
    duration: "8 min", icon: <BarChart3 className="h-5 w-5" />, category: "creator", difficulty: "intermediário",
    tips: ["Publique nos horários de maior audiência (18h-21h)", "Mantenha taxa de engajamento acima de 3%", "Responda rápido às propostas dos anunciantes", "Suba de nível no ranking para taxas melhores"],
    quiz: { question: "Qual o melhor horário para publicar Status?", options: ["6h-8h", "12h-14h", "18h-21h", "23h-1h"], correctIndex: 2, explanation: "O período entre 18h e 21h é quando a maioria das pessoas verifica o WhatsApp após o trabalho." }
  },
  {
    id: "3", title: "Criando artes que convertem",
    description: "Design de peças publicitárias que geram cliques e resultados reais.",
    duration: "6 min", icon: <Palette className="h-5 w-5" />, category: "advertiser", difficulty: "iniciante",
    tips: ["Use cores contrastantes para o CTA", "Textos curtos: máximo 2 linhas", "Inclua prova social quando possível", "Teste A/B com variações de imagem"],
    quiz: { question: "O que é mais importante num anúncio de Status?", options: ["Muito texto explicativo", "CTA claro com cores contrastantes", "Imagem genérica", "Logo grande"], correctIndex: 1, explanation: "Um CTA (Call-to-Action) claro com cores que se destacam do fundo é o que mais gera conversões." }
  },
  {
    id: "4", title: "Segmentação avançada de público",
    description: "Como encontrar os criadores certos para atingir o público ideal da sua marca.",
    duration: "7 min", icon: <Target className="h-5 w-5" />, category: "advertiser", difficulty: "avançado",
    tips: ["Filtre por nicho + região para maior relevância", "Priorize criadores com taxa de engajamento real", "Use o Smart Matchmaking para sugestões por IA", "Diversifique entre micro e macro influenciadores"],
    quiz: { question: "O que é mais importante ao escolher um criador?", options: ["Número de seguidores", "Taxa de engajamento real", "Preço mais baixo", "Foto de perfil bonita"], correctIndex: 1, explanation: "A taxa de engajamento real indica quantas pessoas realmente interagem com o conteúdo, sendo mais valiosa que o número bruto de seguidores." }
  },
  {
    id: "5", title: "Como usar o StatusAI a seu favor",
    description: "Aproveite a IA para encontrar os melhores criadores e prever resultados.",
    duration: "4 min", icon: <Sparkles className="h-5 w-5" />, category: "advertiser", difficulty: "intermediário",
    tips: ["Use o Matchmaker para encontrar criadores ideais", "Analise previsões de ROI antes de investir", "Compare múltiplos criadores antes de decidir", "Revise as sugestões da IA regularmente"],
  },
  {
    id: "6", title: "Construindo sua reputação na plataforma",
    description: "Como subir de rank e conquistar campanhas premium consistentemente.",
    duration: "6 min", icon: <Trophy className="h-5 w-5" />, category: "creator", difficulty: "avançado",
    tips: ["Complete campanhas no prazo para ganhar XP", "Mantenha avaliações acima de 4.0", "Seja consistente na qualidade das publicações", "Interaja profissionalmente com anunciantes"],
    quiz: { question: "O que mais impacta seu rank na plataforma?", options: ["Número de seguidores", "Completar campanhas no prazo", "Preço cobrado", "Antiguidade na plataforma"], correctIndex: 1, explanation: "Completar campanhas dentro do prazo gera XP e mantém sua reputação alta, atraindo mais anunciantes." }
  },
];

export const AcademiaStatusAds = () => {
  const [activeTab, setActiveTab] = useState<"creator" | "advertiser">("creator");
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("academia_completed") || "[]"); } catch { return []; }
  });
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});

  const filteredLessons = lessons.filter(l => l.category === activeTab);
  const completedCount = completedLessons.length;
  const totalCount = lessons.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const toggleComplete = (id: string) => {
    const updated = completedLessons.includes(id) ? completedLessons.filter(x => x !== id) : [...completedLessons, id];
    setCompletedLessons(updated);
    localStorage.setItem("academia_completed", JSON.stringify(updated));
  };

  const submitQuiz = (lessonId: string) => {
    setQuizSubmitted(prev => ({ ...prev, [lessonId]: true }));
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson?.quiz && quizAnswers[lessonId] === lesson.quiz.correctIndex) {
      if (!completedLessons.includes(lessonId)) toggleComplete(lessonId);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "iniciante": return "bg-success/10 text-success";
      case "intermediário": return "bg-warning/10 text-warning";
      case "avançado": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-primary">
          <GraduationCap className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Academia StatusAds</h2>
          <p className="text-sm text-muted-foreground">Aprenda, evolua e ganhe mais</p>
        </div>
      </div>

      <Card className="glass border-border/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Seu progresso</span>
            <span className="text-xs text-muted-foreground">{completedCount}/{totalCount} lições</span>
          </div>
          <Progress value={progress} className="h-2" />
          {completedCount > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <Star className="h-3.5 w-3.5 text-warning fill-warning" />
              <span className="text-xs text-muted-foreground">+{completedCount * 50} XP ganhos com a Academia</span>
            </div>
          )}
          {completedCount === totalCount && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-success/10 rounded-lg">
              <Trophy className="h-4 w-4 text-success" />
              <span className="text-xs font-semibold text-success">🎉 Parabéns! Você completou toda a Academia!</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant={activeTab === "creator" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("creator")} className="gap-1.5">
          <BookOpen className="h-3.5 w-3.5" /> Para Criadores
        </Button>
        <Button variant={activeTab === "advertiser" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("advertiser")} className="gap-1.5">
          <Target className="h-3.5 w-3.5" /> Para Anunciantes
        </Button>
      </div>

      <div className="space-y-3">
        {filteredLessons.map((lesson) => {
          const isExpanded = expandedLesson === lesson.id;
          const isCompleted = completedLessons.includes(lesson.id);
          const hasQuiz = !!lesson.quiz;
          const quizDone = quizSubmitted[lesson.id];
          const quizCorrect = hasQuiz && quizDone && quizAnswers[lesson.id] === lesson.quiz!.correctIndex;

          return (
            <Card
              key={lesson.id}
              className={cn(
                "glass border-border/30 transition-all duration-200 cursor-pointer",
                isCompleted && "border-success/30 bg-success/5",
                isExpanded && "ring-1 ring-primary/20"
              )}
              onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg shrink-0", isCompleted ? "bg-success/10 text-success" : "bg-primary/10 text-primary")}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : lesson.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={cn("font-semibold text-sm", isCompleted ? "text-success line-through" : "text-foreground")}>{lesson.title}</h3>
                      <div className="flex items-center gap-1">
                        {hasQuiz && <Badge variant="outline" className="text-[10px]"><HelpCircle className="h-2.5 w-2.5 mr-0.5" />Quiz</Badge>}
                        <Badge className={cn("text-[10px] shrink-0", getDifficultyColor(lesson.difficulty))}>{lesson.difficulty}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{lesson.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" />{lesson.duration}</div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Lightbulb className="h-3 w-3" />{lesson.tips.length} dicas</div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
                            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <Lightbulb className="h-3.5 w-3.5 text-warning" /> Dicas Práticas
                            </p>
                            {lesson.tips.map((tip, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <ArrowRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                                <span>{tip}</span>
                              </div>
                            ))}

                            {hasQuiz && (
                              <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-3" onClick={(e) => e.stopPropagation()}>
                                <p className="text-xs font-semibold flex items-center gap-1.5">
                                  <HelpCircle className="h-3.5 w-3.5 text-primary" /> Quiz Interactivo
                                </p>
                                <p className="text-sm font-medium">{lesson.quiz!.question}</p>
                                <RadioGroup
                                  value={quizAnswers[lesson.id]?.toString()}
                                  onValueChange={(v) => setQuizAnswers(prev => ({ ...prev, [lesson.id]: parseInt(v) }))}
                                >
                                  {lesson.quiz!.options.map((opt, i) => (
                                    <div key={i} className={cn(
                                      "flex items-center space-x-2 p-2 rounded-lg border transition-colors",
                                      quizDone && i === lesson.quiz!.correctIndex && "border-success bg-success/10",
                                      quizDone && quizAnswers[lesson.id] === i && i !== lesson.quiz!.correctIndex && "border-destructive bg-destructive/10",
                                      !quizDone && "hover:bg-muted/80"
                                    )}>
                                      <RadioGroupItem value={i.toString()} id={`q${lesson.id}-${i}`} disabled={quizDone} />
                                      <Label htmlFor={`q${lesson.id}-${i}`} className="text-xs cursor-pointer flex-1">{opt}</Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                                {!quizDone ? (
                                  <Button size="sm" onClick={() => submitQuiz(lesson.id)} disabled={quizAnswers[lesson.id] === undefined} className="w-full">
                                    Verificar Resposta
                                  </Button>
                                ) : (
                                  <div className={cn("p-2 rounded-lg text-xs", quizCorrect ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                                    {quizCorrect ? "✅ Correcto! " : "❌ Resposta incorrecta. "}
                                    {lesson.quiz!.explanation}
                                  </div>
                                )}
                              </div>
                            )}

                            <Button
                              size="sm"
                              variant={isCompleted ? "outline" : "default"}
                              className="w-full mt-2 gap-1.5"
                              onClick={(e) => { e.stopPropagation(); toggleComplete(lesson.id); }}
                            >
                              {isCompleted ? "Desmarcar como concluída" : <><CheckCircle2 className="h-3.5 w-3.5" />Marcar como concluída (+50 XP)</>}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
