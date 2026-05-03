import type { FastifyInstance } from 'fastify';

import {
  CONTENT_TYPES,
  CONTENT_SUBTYPES,
  listQualityRubrics,
  listWorkflowProfiles,
  listWritingSkillBindings,
} from '@ptce/shared';

export const registerContentMetadataRoutes = (app: FastifyInstance) => {
  app.get('/content-types', async () => ({
    contentTypes: CONTENT_TYPES,
    contentSubtypes: CONTENT_SUBTYPES,
  }));

  app.get('/workflow-profiles', async () => ({
    workflowProfiles: listWorkflowProfiles(),
  }));

  app.get('/quality-rubrics', async () => ({
    qualityRubrics: listQualityRubrics(),
  }));

  app.get('/writing-skill-bindings', async () => ({
    writingSkillBindings: listWritingSkillBindings(),
  }));
};
