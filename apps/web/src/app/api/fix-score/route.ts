import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { oldScore, newScore, dryRun = true } = await request.json();

    // Default: fix 3:11 -> 3:1
    const searchPattern = oldScore || '3:11';
    const replacement = newScore || '3:1';

    // Find all videos with the typo in title
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, match_id')
      .like('title', `%${searchPattern}%`);

    if (videosError) {
      return NextResponse.json({ error: videosError.message }, { status: 500 });
    }

    const results = {
      videosFound: videos?.length || 0,
      videosUpdated: 0,
      matchesUpdated: 0,
      changes: [] as { type: string; before: string; after: string }[],
      dryRun,
    };

    if (!videos || videos.length === 0) {
      return NextResponse.json({ message: 'No videos found with that score', ...results });
    }

    // Process videos
    for (const video of videos) {
      const newTitle = video.title.replace(searchPattern, replacement);
      results.changes.push({
        type: 'video',
        before: video.title,
        after: newTitle,
      });

      if (!dryRun) {
        const { error } = await supabase
          .from('videos')
          .update({ title: newTitle })
          .eq('id', video.id);

        if (!error) {
          results.videosUpdated++;
        }
      }
    }

    // Find and fix related matches
    const matchIds = [...new Set(videos.map(v => v.match_id).filter(Boolean))];

    if (matchIds.length > 0) {
      // Parse the score to get goals_against value
      const [, oldGoalsAgainst] = searchPattern.split(':').map(Number);
      const [, newGoalsAgainst] = replacement.split(':').map(Number);

      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('id, name, goals_for, goals_against')
        .in('id', matchIds)
        .eq('goals_against', oldGoalsAgainst);

      if (!matchError && matches) {
        for (const match of matches) {
          results.changes.push({
            type: 'match',
            before: `${match.name}: ${match.goals_for}:${match.goals_against}`,
            after: `${match.name}: ${match.goals_for}:${newGoalsAgainst}`,
          });

          if (!dryRun) {
            const { error } = await supabase
              .from('matches')
              .update({ goals_against: newGoalsAgainst })
              .eq('id', match.id);

            if (!error) {
              results.matchesUpdated++;
            }
          }
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Fix score error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
