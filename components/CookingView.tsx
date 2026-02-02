'use client';

import { useState, useEffect, useRef } from 'react';
import { DailyMenu } from '@/types/daily-menu';
import { Recipe, RecipeStep } from '@/types/recipe';

interface CookingViewProps {
  dailyMenu: DailyMenu;
  completedSteps: Set<string>;
  setCompletedSteps: (set: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  onComplete: () => void;
}

interface TimerState {
  stepId: string;
  remaining: number;
  isRunning: boolean;
}

export default function CookingView({
  dailyMenu,
  completedSteps,
  setCompletedSteps,
  onComplete,
}: CookingViewProps) {
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(
    dailyMenu.recipes[0]?.id || null
  );
  const [timers, setTimers] = useState<Map<string, TimerState>>(new Map());
  const [finishedTimers, setFinishedTimers] = useState<Set<string>>(new Set());
  const [recentlyChecked, setRecentlyChecked] = useState<Set<string>>(new Set());
  const timerIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 진행바 색상 배열
  const progressColors = [
    '#4D99CC', // 파란색
    '#10B981', // 초록색
    '#F59E0B', // 주황색
    '#EF4444', // 빨간색
    '#8B5CF6', // 보라색
  ];

  // 조리단계 텍스트에서 수량을 추출하고 인분에 따라 변환하는 함수
  const scaleStepDescription = (description: string, recipeBaseServings: number, currentServings: number): string => {
    if (recipeBaseServings === currentServings || recipeBaseServings === 0) return description;
    
    const ratio = currentServings / recipeBaseServings;
    
    // 패턴: 숫자 + 단위 (g, kg, ml, L, 개, 스푼, 큰술, 작은술 등)
    // 예: "10g", "1kg", "2개", "1스푼", "1큰술", "맛술 10g", "10g을 넣어주세요" 등
    // 공백이 있을 수도 있고 없을 수도 있음
    const quantityPattern = /(\d+(?:\.\d+)?)\s*(g|kg|ml|L|개|스푼|큰술|작은술|컵|T|t|tbsp|tsp|tablespoon|teaspoon)/gi;
    
    return description.replace(quantityPattern, (match, number, unit) => {
      const originalQuantity = parseFloat(number);
      const scaledQuantity = originalQuantity * ratio;
      
      // 소수점 처리: 0.1 이하는 0.1로, 그 외는 적절한 소수점 자리수로
      let formattedQuantity: string;
      if (scaledQuantity < 0.1) {
        formattedQuantity = '0.1';
      } else if (scaledQuantity < 1) {
        formattedQuantity = scaledQuantity.toFixed(1);
      } else if (scaledQuantity % 1 === 0) {
        formattedQuantity = scaledQuantity.toString();
      } else {
        formattedQuantity = scaledQuantity.toFixed(1);
      }
      
      // 원본 단위의 대소문자 유지
      return `${formattedQuantity}${unit}`;
    });
  };

  const toggleStep = (stepId: string, stepDuration?: number) => {
    const stepInfo = findStepInRecipe(stepId);
    if (!stepInfo) return;

    const { recipe, step, stepIndex } = stepInfo;
    const newSet = new Set(completedSteps);
    
    if (newSet.has(stepId)) {
      // 체크 해제 시도
      // 이전 단계들이 완료되어 있으면 체크 해제 불가
      const hasLaterCompletedSteps = recipe.steps
        .slice(stepIndex + 1)
        .some((s) => completedSteps.has(s.id));
      
      if (hasLaterCompletedSteps) {
        // 나중 단계가 완료되어 있으면 체크 해제 불가
        return;
      }
      
      // 체크 해제 가능
      newSet.delete(stepId);
      setRecentlyChecked((prev) => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
      // 타이머 정지
      stopTimer(stepId);
    } else {
      // 체크 시도
      // 이전 단계가 완료되지 않았으면 체크 불가 (순차적 체크)
      const previousSteps = recipe.steps.slice(0, stepIndex);
      const allPreviousCompleted = previousSteps.every((s) => completedSteps.has(s.id));
      
      if (!allPreviousCompleted && previousSteps.length > 0) {
        // 이전 단계가 완료되지 않았으면 체크 불가
        return;
      }
      
      // 나중 단계를 체크하면 이전 단계들도 자동 체크
      previousSteps.forEach((prevStep) => {
        if (!newSet.has(prevStep.id)) {
          newSet.add(prevStep.id);
          setRecentlyChecked((prev) => {
            const newSet = new Set(prev);
            newSet.add(prevStep.id);
            setTimeout(() => {
              setRecentlyChecked((current) => {
                const updated = new Set(current);
                updated.delete(prevStep.id);
                return updated;
              });
            }, 500);
            return newSet;
          });
        }
      });
      
      // 현재 단계 체크
      newSet.add(stepId);
      setRecentlyChecked((prev) => {
        const newSet = new Set(prev);
        newSet.add(stepId);
        // 1초 후 애니메이션 제거
        setTimeout(() => {
          setRecentlyChecked((current) => {
            const updated = new Set(current);
            updated.delete(stepId);
            return updated;
          });
        }, 500);
        return newSet;
      });
      
      // 다음 버튼 클릭 시 finishedTimers에서 제거 (테두리 정상화)
      setFinishedTimers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
      
      // 타이머 시작 (텍스트에 시간이 명시된 경우만)
      const extractedDuration = extractDurationFromText(step.description);
      if (extractedDuration) {
        startTimer(stepId, extractedDuration);
      }
    }
    setCompletedSteps(newSet);
  };

  const startTimer = (stepId: string, duration: number) => {
    // 기존 타이머가 있으면 정지
    stopTimer(stepId);

    // 타이머 시작 시 finishedTimers에서 제거 (재시작 시 빨간색 해제)
    setFinishedTimers((prev) => {
      const newSet = new Set(prev);
      newSet.delete(stepId);
      return newSet;
    });

    setTimers((prev) => {
      const newTimers = new Map(prev);
      newTimers.set(stepId, {
        stepId,
        remaining: duration,
        isRunning: true,
      });
      return newTimers;
    });

    const interval = setInterval(() => {
      setTimers((prev) => {
        const newTimers = new Map(prev);
        const timer = newTimers.get(stepId);
        if (timer) {
          if (timer.remaining <= 1) {
            // 타이머 종료
            newTimers.delete(stepId);
            clearInterval(interval);
            timerIntervals.current.delete(stepId);
            
            // 타이머 종료 상태 기록 (자동 진행하지 않고 사용자가 직접 다음 버튼을 눌러야 함)
            setFinishedTimers((prev) => {
              const newSet = new Set(prev);
              newSet.add(stepId);
              return newSet;
            });
            
            // 타이머가 끝난 레시피를 펼치기
            const currentRecipe = dailyMenu.recipes.find((r) =>
              r.steps.some((s) => s.id === stepId)
            );
            if (currentRecipe) {
              setExpandedRecipe(currentRecipe.id);
            }
            
            // 알림
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('조리 완료', {
                body: '단계가 완료되었습니다!',
                icon: '/favicon.ico',
              });
            } else if ('Notification' in window && Notification.permission !== 'denied') {
              Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                  new Notification('조리 완료', {
                    body: '단계가 완료되었습니다!',
                    icon: '/favicon.ico',
                  });
                }
              });
            }
            // 사운드 알림 (브라우저 지원)
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZkDkI');
              audio.play().catch(() => {});
            } catch (e) {
              // 사운드 재생 실패 무시
            }
            return newTimers;
          }
          newTimers.set(stepId, {
            ...timer,
            remaining: timer.remaining - 1,
          });
        }
        return newTimers;
      });
    }, 1000);

    timerIntervals.current.set(stepId, interval);
  };

  const stopTimer = (stepId: string) => {
    const interval = timerIntervals.current.get(stepId);
    if (interval) {
      clearInterval(interval);
      timerIntervals.current.delete(stepId);
    }
    setTimers((prev) => {
      const newTimers = new Map(prev);
      newTimers.delete(stepId);
      return newTimers;
    });
    // 수동 정지 시에는 finishedTimers에 추가하지 않음 (기본 상태로 유지)
  };

  useEffect(() => {
    // 컴포넌트 언마운트 시 모든 타이머 정리
    return () => {
      timerIntervals.current.forEach((interval) => clearInterval(interval));
      timerIntervals.current.clear();
    };
  }, []);

  // 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const getRecipeProgress = (recipe: Recipe) => {
    const totalSteps = recipe.steps.length;
    const completed = recipe.steps.filter((step) =>
      completedSteps.has(step.id)
    ).length;
    return totalSteps > 0 ? (completed / totalSteps) * 100 : 0;
  };

  const getNextStep = (recipe: Recipe) => {
    return recipe.steps.find((step) => !completedSteps.has(step.id));
  };

  const allRecipesComplete = dailyMenu.recipes.every((recipe) => {
    return recipe.steps.every((step) => completedSteps.has(step.id));
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 텍스트에서 시간 추출 (분, 초 등이 명시된 경우만)
  const extractDurationFromText = (text: string): number | null => {
    // 분 단위 추출 (예: "30분", "1-2분" 등)
    const minuteMatch = text.match(/(\d+)(?:-(\d+))?\s*분/);
    if (minuteMatch) {
      const minutes = parseInt(minuteMatch[1], 10);
      return minutes * 60; // 초로 변환
    }
    
    // 초 단위 추출 (예: "30초", "1-2초" 등)
    const secondMatch = text.match(/(\d+)(?:-(\d+))?\s*초/);
    if (secondMatch) {
      const seconds = parseInt(secondMatch[1], 10);
      return seconds;
    }
    
    return null;
  };

  // 레시피에서 특정 단계 찾기
  const findStepInRecipe = (stepId: string): { recipe: Recipe; step: RecipeStep; stepIndex: number } | null => {
    for (const recipe of dailyMenu.recipes) {
      const stepIndex = recipe.steps.findIndex((s) => s.id === stepId);
      if (stepIndex !== -1) {
        return { recipe, step: recipe.steps[stepIndex], stepIndex };
      }
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="bg-transparent">
        {/* Progress Board - 항상 위에 고정, 2열 그리드 */}
        <div className="sticky top-0 z-10 bg-white pt-4 pb-4 mb-8 border-b border-gray-200 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            {dailyMenu.recipes.map((recipe, index) => {
              const progress = getRecipeProgress(recipe);
              const nextStep = getNextStep(recipe);
              const isHighlighted = nextStep !== undefined;
              const isRecipeComplete = recipe.steps.every((step) => completedSteps.has(step.id));
              // 완료된 레시피는 초록색, 그 외는 기존 색상
              const color = isRecipeComplete ? '#10B981' : progressColors[index % progressColors.length];
              
              return (
                <div key={recipe.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className={`text-sm font-medium truncate ${
                          isHighlighted ? 'highlight-pulse' : ''
                        }`}
                        style={{ color: '#1A1A1A' }}
                      >
                        {recipe.name}
                      </span>
                      {isRecipeComplete ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded text-xs font-semibold">
                          완료
                        </span>
                      ) : isHighlighted ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-semibold">
                          진행중
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      {nextStep && timers.has(nextStep.id) && (
                        <span className="text-sm font-mono font-semibold" style={{ color: '#1A1A1A' }}>
                          {formatTime(timers.get(nextStep.id)!.remaining)}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recipe Accordion - 1열 */}
        <div className="space-y-4">
          {(() => {
            // 정렬: 타이머 끝난 항목 > 타이머 실행 중 > 일반 > 완료된 항목(맨 아래)
            const sortedRecipes = [...dailyMenu.recipes].sort((a, b) => {
              const aNextStep = getNextStep(a);
              const bNextStep = getNextStep(b);
              const aIsComplete = a.steps.every((step) => completedSteps.has(step.id));
              const bIsComplete = b.steps.every((step) => completedSteps.has(step.id));
              
              // 완료된 항목은 맨 아래로
              if (aIsComplete && !bIsComplete) return 1;
              if (!aIsComplete && bIsComplete) return -1;
              
              // 둘 다 완료되었으면 순서 유지
              if (aIsComplete && bIsComplete) return 0;
              
              // 타이머가 필요한 단계이고, 타이머가 시작되었다가 끝났을 때만 타이머 종료로 판단
              const aHasDuration = aNextStep && extractDurationFromText(aNextStep.description);
              const bHasDuration = bNextStep && extractDurationFromText(bNextStep.description);
              const aTimerEnded = aNextStep && aHasDuration && finishedTimers.has(aNextStep.id);
              const bTimerEnded = bNextStep && bHasDuration && finishedTimers.has(bNextStep.id);
              
              // 타이머가 끝난 항목을 맨 위로 (가장 높은 우선순위)
              if (aTimerEnded && !bTimerEnded) return -1;
              if (!aTimerEnded && bTimerEnded) return 1;
              
              // 타이머가 실행 중인 항목을 다음으로
              const aHasActiveTimer = aNextStep && timers.has(aNextStep.id) && (timers.get(aNextStep.id)?.remaining ?? 0) > 0;
              const bHasActiveTimer = bNextStep && timers.has(bNextStep.id) && (timers.get(bNextStep.id)?.remaining ?? 0) > 0;
              
              if (aHasActiveTimer && !bHasActiveTimer) return -1;
              if (!aHasActiveTimer && bHasActiveTimer) return 1;
              
              // 둘 다 타이머가 끝났으면 순서 유지
              if (aTimerEnded && bTimerEnded) return 0;
              
              return 0;
            });
            
            return sortedRecipes.map((recipe, index) => {
              const isExpanded = expandedRecipe === recipe.id;
              const nextStep = getNextStep(recipe);
              const isRecipeComplete = recipe.steps.every((step) => completedSteps.has(step.id));
              
              // 이전 레시피가 완료되지 않았고 현재 레시피가 완료된 경우 구분선 추가
              const prevRecipe = index > 0 ? sortedRecipes[index - 1] : null;
              const prevIsComplete = prevRecipe ? prevRecipe.steps.every((step) => completedSteps.has(step.id)) : false;
              const showDivider = !prevIsComplete && isRecipeComplete;
              // 타이머가 필요한 단계이고, 타이머가 시작되었다가 끝났을 때만 타이머 종료로 판단
              const hasDuration = nextStep && extractDurationFromText(nextStep.description);
              const timerActive = nextStep && hasDuration && timers.has(nextStep.id) && (timers.get(nextStep.id)?.remaining ?? 0) > 0;
              const timerEnded = nextStep && hasDuration && finishedTimers.has(nextStep.id);
              
              // 테두리 색상 결정: 활성화 중이면 파란색, 종료되면 빨간색, 그 외는 기본 색상
              let borderColor = '#4B5563';
              let borderWidth = '1px';
              if (timerActive) {
                borderColor = '#4D99CC'; // 파란색
                borderWidth = '2px';
              } else if (timerEnded) {
                borderColor = '#FCA5A5'; // 빨간색
                borderWidth = '2px';
              }
              
              // 배경색 결정: 타이머 활성화 시 옅은 파란색, 타이머 종료 시 옅은 빨간색
              let backgroundColor = '';
              if (timerActive) {
                backgroundColor = '#EFF6FF'; // 옅은 파란색
              } else if (timerEnded) {
                backgroundColor = '#FEF2F2'; // 옅은 빨간색
              } else if (isRecipeComplete) {
                backgroundColor = '#F9FAFB'; // gray-50
              }
              
              return (
                <div key={recipe.id}>
                  {showDivider && (
                    <div className="my-6 border-t-2 border-gray-700"></div>
                  )}
                  <div
                    onClick={() => setExpandedRecipe(isExpanded ? null : recipe.id)}
                    className={`rounded-xl overflow-hidden transition-all shadow-sm cursor-pointer ${
                      timerEnded || timerActive
                        ? 'shadow-md'
                        : ''
                    }`}
                    style={{
                      borderColor: borderColor,
                      borderWidth: borderWidth,
                      borderStyle: 'solid',
                      backgroundColor: backgroundColor || undefined
                    }}
                  >
                <div className={`px-6 py-4 ${
                  timerActive || timerEnded
                    ? '' // 배경색은 상위 div에서 처리
                    : isRecipeComplete 
                    ? 'bg-gray-50' 
                    : 'bg-white'
                }`}
                style={timerActive ? { backgroundColor: '#EFF6FF' } : timerEnded ? { backgroundColor: '#FEF2F2' } : undefined}
                >
                  {/* 3단 구조: [펼쳐보기] [텍스트] [다음] - 버튼 위치 고정, 텍스트는 가운데 영역 */}
                  <div className="flex items-center gap-4">
                    {/* 왼쪽 고정: 레시피명 + 펼치기 chevron + 타이머 */}
                    <div className="flex items-center gap-2 flex-shrink-0 min-w-[140px]">
                      <span className="font-semibold truncate" style={{ color: '#1A1A1A' }}>
                        {recipe.name}
                      </span>
                      <svg
                        className={`w-5 h-5 transition-transform flex-shrink-0 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      {nextStep && timers.has(nextStep.id) && (
                        <span className="text-sm font-mono font-semibold flex-shrink-0" style={{ color: '#1A1A1A' }}>
                          {formatTime(timers.get(nextStep.id)!.remaining)}
                        </span>
                      )}
                      {nextStep && extractDurationFromText(nextStep.description) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const extractedDuration = extractDurationFromText(nextStep.description);
                            if (extractedDuration) {
                              if (timers.has(nextStep.id)) {
                                stopTimer(nextStep.id);
                              } else {
                                startTimer(nextStep.id, extractedDuration);
                              }
                            }
                          }}
                          className={`p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0 ${
                            timers.has(nextStep.id) ? 'text-[#4D99CC]' : 'text-gray-400'
                          }`}
                          title={timers.has(nextStep.id) ? '타이머 정지' : '타이머 시작'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {/* 가운데: 조리 단계 텍스트 (좌우 여백으로 버튼과 분리) */}
                    <div className="flex-1 min-w-0 pl-8 pr-4 flex items-center">
                      {isRecipeComplete ? (
                        <span className="text-sm text-gray-600">완료</span>
                      ) : nextStep ? (() => {
                        const stepInfo = findStepInRecipe(nextStep.id);
                        const recipe = stepInfo?.recipe;
                        const scaledDescription = recipe 
                          ? scaleStepDescription(nextStep.description, recipe.baseServings, dailyMenu.servings)
                          : nextStep.description;
                        return (
                          <span className="text-sm font-medium text-gray-900 break-words leading-relaxed">
                            {nextStep.order}단계 - {scaledDescription}
                          </span>
                        );
                      })() : null}
                    </div>
                    {/* 오른쪽 고정: 다음 버튼 (SVG) */}
                    <div className="flex-shrink-0 w-[60px] flex justify-end">
                      {nextStep && (() => {
                        // 현재 레시피의 nextStep인지 확인
                        const currentRecipeNextStep = recipe.steps.find((s) => s.id === nextStep.id);
                        // 현재 레시피의 다음 단계가 맞는지 확인
                        const isCurrentRecipeStep = currentRecipeNextStep !== undefined;
                        
                        return isCurrentRecipeStep ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const stepInfo = findStepInRecipe(nextStep.id);
                              if (stepInfo && stepInfo.recipe.id === recipe.id) {
                                const { step } = stepInfo;
                                const extractedDuration = extractDurationFromText(step.description);
                                toggleStep(nextStep.id, extractedDuration || undefined);
                              }
                            }}
                            className="p-2 bg-[#4D99CC] text-white rounded-lg hover:bg-[#3d89bc] transition-colors shadow-sm flex items-center justify-center"
                            style={{ minWidth: '48px', minHeight: '48px' }}
                            title="다음"
                          >
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className={`px-6 py-4 border-t border-gray-200 ${
                    isRecipeComplete ? 'bg-gray-100' : 'bg-gray-50'
                  }`}>
                    <div className="space-y-4">
                      {recipe.steps.map((step, stepIndex) => {
                        const isStepCompleted = completedSteps.has(step.id);
                        const isNextStep = nextStep?.id === step.id;
                        const timer = timers.get(step.id);
                        const wasJustChecked = recentlyChecked.has(step.id);
                        
                        // 이전 단계 완료 여부 확인
                        const previousSteps = recipe.steps.slice(0, stepIndex);
                        const allPreviousCompleted = previousSteps.every((s) => completedSteps.has(s.id));
                        const canCheck = allPreviousCompleted || previousSteps.length === 0;
                        
                        // 나중 단계가 완료되어 있으면 체크 해제 불가
                        const laterSteps = recipe.steps.slice(stepIndex + 1);
                        const hasLaterCompletedSteps = laterSteps.some((s) => completedSteps.has(s.id));
                        const canUncheck = !hasLaterCompletedSteps;
                        
                        return (
                          <div
                            key={step.id}
                            onClick={() => {
                              if (isStepCompleted && !canUncheck) return; // 체크 해제 불가
                              if (!isStepCompleted && !canCheck) return; // 체크 불가
                              toggleStep(step.id, step.duration);
                            }}
                            className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                              !canCheck && !isStepCompleted
                                ? 'cursor-not-allowed opacity-50'
                                : (isStepCompleted && !canUncheck)
                                ? 'cursor-not-allowed'
                                : 'cursor-pointer'
                            } ${
                              isNextStep
                                ? 'bg-red-50 border-2 border-red-300 highlight-pulse'
                                : isStepCompleted
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-white border border-gray-200'
                            }`}
                          >
                            <div className="relative flex-shrink-0">
                              <div
                                className={`relative w-5 h-5 mt-0.5 rounded border-2 cursor-pointer flex-shrink-0 flex items-center justify-center ${
                                  isStepCompleted
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'bg-white border-gray-300'
                                } ${wasJustChecked ? 'checkbox-animate' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isStepCompleted && !canUncheck) return; // 체크 해제 불가
                                  if (!isStepCompleted && !canCheck) return; // 체크 불가
                                  toggleStep(step.id, step.duration);
                                }}
                              >
                                {isStepCompleted && (
                                  <svg
                                    className="w-3.5 h-3.5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      className={wasJustChecked ? 'checkmark-path' : ''}
                                      d="M5 13l4 4L19 7"
                                      style={wasJustChecked ? {} : { strokeDashoffset: 0 }}
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-sm font-medium ${
                                    isNextStep
                                      ? 'text-red-600 font-bold'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {step.order}단계
                                </span>
                                {(() => {
                                  const extractedDuration = extractDurationFromText(step.description);
                                  if (extractedDuration) {
                                    const minutes = Math.floor(extractedDuration / 60);
                                    const seconds = extractedDuration % 60;
                                    if (minutes > 0 && seconds > 0) {
                                      return (
                                        <span className="text-xs text-gray-400">
                                          {minutes}분 {seconds}초
                                        </span>
                                      );
                                    } else if (minutes > 0) {
                                      return (
                                        <span className="text-xs text-gray-400">
                                          {minutes}분
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className="text-xs text-gray-400">
                                          {seconds}초
                                        </span>
                                      );
                                    }
                                  }
                                  return null;
                                })()}
                                {timer && (
                                  <span className={`text-xs font-mono font-semibold ${
                                    timer.remaining <= 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    남은 시간: {formatTime(timer.remaining)}
                                  </span>
                                )}
                              </div>
                              <p
                                className={`text-base ${
                                  isStepCompleted
                                    ? 'text-gray-500 line-through'
                                    : isNextStep
                                    ? 'text-red-700 font-semibold'
                                    : 'text-gray-900'
                                }`}
                              >
                                {scaleStepDescription(step.description, recipe.baseServings, dailyMenu.servings)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              {timerEnded && (
                <div className="px-6 py-2 text-xs text-red-600 font-medium">
                  타이머가 완료되었습니다
                </div>
              )}
                </div>
              );
            });
          })()}
        </div>

        {/* 조리 완료 플로팅 버튼 - 네비게이션 바로 위 (요리시작 버튼과 같은 위치) */}
        <div 
          className="fixed left-0 right-0 z-50 px-4"
          style={{ 
            bottom: `calc(70px + 25px + env(safe-area-inset-bottom, 0px))`,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          <div className="max-w-4xl mx-auto">
            <button
              onClick={allRecipesComplete ? onComplete : undefined}
              disabled={!allRecipesComplete}
              className={`w-full rounded-xl font-semibold text-lg transition-colors shadow-lg flex items-center justify-center gap-2 ${
                allRecipesComplete
                  ? 'bg-[#4D99CC] text-white hover:bg-[#3d89bc] cursor-pointer'
                  : 'bg-white text-gray-400 cursor-not-allowed border border-gray-300'
              }`}
              style={{ paddingTop: '1.375rem', paddingBottom: '1.375rem' }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              조리 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
