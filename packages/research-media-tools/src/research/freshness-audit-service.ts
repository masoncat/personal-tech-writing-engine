import type {
  FreshnessAudit,
  FreshnessSourceAssessment,
  FreshnessWarning,
  ResearchPackage,
  SourceType,
} from '../types.js';

export interface AuditFreshnessInput {
  currentDate: string;
  topicTimeSensitivity: 'low' | 'medium' | 'high';
  researchPackage: ResearchPackage;
}

export const auditFreshness = ({
  currentDate,
  topicTimeSensitivity,
  researchPackage,
}: AuditFreshnessInput): FreshnessAudit => {
  const currentYear = Number(currentDate.slice(0, 4));
  const sources = researchPackage.sources.map((source): FreshnessSourceAssessment => {
    const sourceYear = getSourceYear(source.publishedAt, source.title);
    const sourceType = inferSourceType(source.title, source.url);

    return {
      url: source.url,
      title: source.title,
      publishedAt: source.publishedAt,
      sourceYear,
      sourceType,
      freshness: assessFreshness({ currentYear, sourceYear, sourceType }),
      usageBoundary: buildUsageBoundary({ currentDate, sourceYear, sourceType }),
    };
  });
  const warnings = buildWarnings({ currentDate, currentYear, topicTimeSensitivity, sources });
  const requiredDisclosures = buildRequiredDisclosures({ currentDate, sources });

  return {
    currentDate,
    topicTimeSensitivity,
    sources,
    warnings,
    requiredDisclosures,
    pass: topicTimeSensitivity === 'high'
      ? !warnings.some((warning) => warning.code === 'insufficient_current_year_sources')
      : true,
  };
};

const inferSourceType = (title: string, url: string): SourceType => {
  const value = `${title} ${url}`.toLowerCase();
  if (/survey|developer survey|annual report|state of/.test(value)) {
    return 'annual_report';
  }
  if (/blog/.test(value)) {
    return 'survey_pulse';
  }
  if (/announcement|introducing|launch|released|press/.test(value)) {
    return 'product_announcement';
  }
  if (/news/.test(value)) {
    return 'news';
  }
  if (/analysis|report/.test(value)) {
    return 'analysis';
  }
  return 'unknown';
};

const getSourceYear = (publishedAt: string | undefined, title: string): number | undefined => {
  if (publishedAt && /^\d{4}/.test(publishedAt)) {
    return Number(publishedAt.slice(0, 4));
  }

  const match = title.match(/20\d{2}/);
  return match ? Number(match[0]) : undefined;
};

const assessFreshness = ({
  currentYear,
  sourceYear,
  sourceType,
}: {
  currentYear: number;
  sourceYear: number | undefined;
  sourceType: SourceType;
}): FreshnessSourceAssessment['freshness'] => {
  if (!sourceYear) {
    return 'undated';
  }
  if (sourceYear === currentYear) {
    return 'current';
  }
  if (sourceYear === currentYear - 1 && sourceType === 'annual_report') {
    return 'latest_available';
  }
  return 'stale';
};

const buildUsageBoundary = ({
  currentDate,
  sourceYear,
  sourceType,
}: {
  currentDate: string;
  sourceYear: number | undefined;
  sourceType: SourceType;
}): string => {
  if (!sourceYear) {
    return '来源未提供清晰发布时间，只能作为背景参考。';
  }
  if (sourceType === 'annual_report' && sourceYear < Number(currentDate.slice(0, 4))) {
    return `截至 ${currentDate}，该来源可作为最新已发布年度报告的基线，不能写成当前年份数据。`;
  }
  return `该来源可用于 ${sourceYear} 年相关事实锚定。`;
};

const buildWarnings = ({
  currentYear,
  topicTimeSensitivity,
  sources,
}: {
  currentDate: string;
  currentYear: number;
  topicTimeSensitivity: 'low' | 'medium' | 'high';
  sources: FreshnessSourceAssessment[];
}): FreshnessWarning[] => {
  const warnings: FreshnessWarning[] = [];
  const currentSources = sources.filter((source) => source.sourceYear === currentYear);

  for (const source of sources) {
    if (!source.sourceYear) {
      warnings.push({
        code: 'missing_date',
        message: `${source.title} 缺少明确发布时间。`,
        sourceUrl: source.url,
      });
    }
    if (source.freshness === 'stale') {
      warnings.push({
        code: 'stale_source',
        message: `${source.title} 对当前高时效主题偏旧。`,
        sourceUrl: source.url,
      });
    }
    if (source.freshness === 'latest_available') {
      warnings.push({
        code: 'latest_annual_not_current_year',
        message: `${source.title} 是上一年度报告，正文必须注明时效边界。`,
        sourceUrl: source.url,
      });
    }
  }

  if (topicTimeSensitivity === 'high' && currentSources.length < 2) {
    warnings.push({
      code: 'insufficient_current_year_sources',
      message: `高时效主题至少需要 2 个 ${currentYear} 年来源。`,
    });
  }

  return warnings;
};

const buildRequiredDisclosures = ({
  currentDate,
  sources,
}: {
  currentDate: string;
  sources: FreshnessSourceAssessment[];
}): string[] =>
  sources
    .filter((source) => source.freshness === 'latest_available')
    .map((source) => `截至 ${currentDate}，${source.title} 作为最新已发布年度报告使用，本文不把它写成当前年份数据。`);
