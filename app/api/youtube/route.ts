import { NextRequest, NextResponse } from 'next/server';

// YouTube 비디오 정보 가져오기 (설명 및 고정 댓글 포함)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  try {
    // YouTube Data API v3를 사용하여 비디오 정보 가져오기
    let title: string | null = null;
    let description: string | null = null;
    let author: string | null = null;
    let thumbnail: string | null = null;
    let pinnedComment: string | null = null;

    if (apiKey) {
      // 비디오 정보 가져오기
      const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
      );

      if (videoResponse.ok) {
        const videoData = await videoResponse.json();
        console.log('YouTube 비디오 API 응답:', {
          hasItems: !!videoData.items,
          itemsCount: videoData.items?.length || 0
        });
        
        if (videoData.items && videoData.items.length > 0) {
          const snippet = videoData.items[0].snippet;
          title = snippet.title || null;
          description = snippet.description || null;
          author = snippet.channelTitle || null;
          thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || null;
          
          console.log('✅ 비디오 정보 가져오기 성공:', {
            hasTitle: !!title,
            hasDescription: !!description,
            descriptionLength: description?.length || 0,
            descriptionPreview: description?.substring(0, 100) || '없음'
          });
        } else {
          console.warn('⚠️ 비디오 데이터가 없음');
        }
      } else {
        const errorText = await videoResponse.text();
        console.error('❌ 비디오 정보 가져오기 실패:', videoResponse.status, errorText);
      }

      // 고정 댓글 가져오기
      try {
        console.log('댓글 가져오기 시작, videoId:', videoId);
        const commentsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&order=relevance&key=${apiKey}`
        );

        console.log('댓글 API 응답 상태:', commentsResponse.status);
        
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          console.log('댓글 데이터 가져오기 성공, 댓글 개수:', commentsData.items?.length || 0);
          console.log('댓글 데이터 샘플:', JSON.stringify(commentsData.items?.[0], null, 2));
          
          if (commentsData.items && commentsData.items.length > 0) {
            // 고정 댓글 찾기
            // YouTube API에서는 고정 댓글을 명시적으로 표시하지 않으므로
            // 첫 번째 댓글(가장 관련성 높은 댓글)을 고정 댓글로 간주
            // 또는 좋아요가 가장 많은 댓글을 선택
            
            // 방법 1: 첫 번째 댓글 사용 (가장 관련성 높은 댓글)
            const firstComment = commentsData.items[0]?.snippet?.topLevelComment?.snippet;
            if (firstComment && firstComment.textDisplay) {
              pinnedComment = firstComment.textDisplay;
              console.log('✅ 고정 댓글 선택 (첫 번째 댓글, 좋아요:', firstComment.likeCount || 0, ')');
              if (pinnedComment) {
                console.log('댓글 내용 (처음 100자):', pinnedComment.substring(0, 100));
              }
            }
            
            // 방법 2: 좋아요가 가장 많은 댓글 찾기 (더 나은 방법일 수 있음)
            let bestComment = null;
            let maxLikes = 0;
            
            for (const item of commentsData.items) {
              const comment = item.snippet?.topLevelComment?.snippet;
              if (comment && comment.textDisplay) {
                const likeCount = comment.likeCount || 0;
                // 좋아요가 가장 많은 댓글 선택
                if (likeCount > maxLikes) {
                  maxLikes = likeCount;
                  bestComment = comment.textDisplay;
                }
              }
            }
            
            // 좋아요가 많은 댓글이 첫 번째 댓글보다 좋아요가 많으면 그것을 사용
            if (bestComment && maxLikes > (firstComment?.likeCount || 0)) {
              pinnedComment = bestComment;
              console.log('✅ 고정 댓글 선택 (좋아요가 가장 많은 댓글, 좋아요 수:', maxLikes, ')');
              if (pinnedComment) {
                console.log('댓글 내용 (처음 100자):', pinnedComment.substring(0, 100));
              }
            }
          } else {
            console.log('⚠️ 댓글이 없음');
          }
        } else {
          const errorText = await commentsResponse.text();
          console.error('❌ 댓글 가져오기 실패:', commentsResponse.status, errorText);
          
          // 에러 상세 정보
          try {
            const errorData = JSON.parse(errorText);
            console.error('에러 상세:', errorData);
          } catch (e) {
            // JSON 파싱 실패 시 그대로 출력
          }
        }
      } catch (commentError) {
        console.error('❌ 댓글 가져오기 예외:', commentError);
        // 댓글 가져오기 실패해도 계속 진행
      }
      
      console.log('최종 고정 댓글:', pinnedComment ? `${pinnedComment.substring(0, 50)}...` : '없음');
    } else {
      // API 키가 없으면 noembed.com 사용 (제목만)
      const noembedResponse = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      );
      
      if (noembedResponse.ok) {
        const noembedData = await noembedResponse.json();
        title = noembedData.title || null;
        author = noembedData.author_name || null;
        thumbnail = noembedData.thumbnail_url || null;
      }
    }

    const result = {
      title,
      description,
      author,
      thumbnail,
      pinnedComment,
      hasApiKey: !!apiKey,
    };
    
    console.log('최종 반환 데이터:', {
      hasTitle: !!result.title,
      hasDescription: !!result.description,
      hasPinnedComment: !!result.pinnedComment,
      descriptionLength: result.description?.length || 0,
      pinnedCommentLength: result.pinnedComment?.length || 0
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('YouTube 정보 가져오기 실패:', error);
    return NextResponse.json(
      { error: 'Failed to fetch YouTube information', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
