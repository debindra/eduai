/**
 * STUB — overwritten by `pnpm generate:api-types` (openapi-typescript from /api/docs-json).
 * Do not hand-edit response shapes here once the API is running; regenerate instead.
 */

export type paths = {
  '/health': {
    get: {
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['HealthResponse'];
          };
        };
      };
    };
  };
  '/auth/login': {
    post: {
      requestBody: {
        content: {
          'application/json': components['schemas']['LoginRequest'];
        };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['LoginResponse'];
          };
        };
      };
    };
  };
  '/auth/invite': {
    post: {
      requestBody: {
        content: {
          'application/json': components['schemas']['InviteRequest'];
        };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['InviteResponse'];
          };
        };
      };
    };
  };
  '/auth/accept-invite': {
    post: {
      requestBody: {
        content: {
          'application/json': components['schemas']['AcceptInviteRequest'];
        };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['MessageResponse'];
          };
        };
      };
    };
  };
  '/auth/request-recovery-otp': {
    post: {
      requestBody: {
        content: {
          'application/json': components['schemas']['RecoveryOtpRequest'];
        };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['MessageResponse'];
          };
        };
      };
    };
  };
  '/auth/verify-recovery-otp-and-set-password': {
    post: {
      requestBody: {
        content: {
          'application/json': components['schemas']['VerifyRecoveryRequest'];
        };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['MessageResponse'];
          };
        };
      };
    };
  };
  '/bands': {
    get: {
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['BandsListResponse'];
          };
        };
      };
    };
  };
  '/calendar/{schoolId}/setup': {
    post: {
      parameters: {
        path: { schoolId: string };
      };
      requestBody: {
        content: {
          'application/json': components['schemas']['CalendarSetupRequest'];
        };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['CalendarSetupResponse'];
          };
        };
      };
    };
  };
  '/calendar/{schoolId}/status': {
    get: {
      parameters: {
        path: { schoolId: string };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['CalendarStatusResponse'];
          };
        };
      };
    };
  };
  '/calendar/{schoolId}/festival-template': {
    get: {
      parameters: {
        path: { schoolId: string };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['FestivalTemplateResponse'];
          };
        };
      };
    };
    patch: {
      parameters: {
        path: { schoolId: string };
      };
      requestBody: {
        content: {
          'application/json': components['schemas']['FestivalTemplatePatch'];
        };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['FestivalTemplateResponse'];
          };
        };
      };
    };
  };
  '/calendar/{schoolId}/approve': {
    post: {
      parameters: {
        path: { schoolId: string };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['CalendarApproveResponse'];
          };
        };
      };
    };
  };
  '/calendar/{schoolId}/teaching-days': {
    get: {
      parameters: {
        path: { schoolId: string };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['TeachingDaysResponse'];
          };
        };
      };
    };
  };
};

export type components = {
  schemas: {
    HealthResponse: {
      status: string;
      dbPackage: string;
      database: {
        configured: boolean;
        ok: boolean;
        schoolCount: number | null;
        error?: string;
      };
    };
    LoginRequest: {
      identifier: string;
      password: string;
    };
    LoginResponse: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      identity: {
        id: string;
        email: string | null;
        phone: string | null;
        displayName: string | null;
      };
      memberType: 'admin' | 'teacher';
      schoolId: string;
    };
    InviteRequest: {
      schoolId: string;
      memberType: 'admin' | 'teacher';
      email?: string;
      phone?: string;
      displayName?: string;
    };
    InviteResponse: {
      identityId: string;
      delivery: 'email' | 'mobile';
    };
    AcceptInviteRequest: {
      identityId: string;
      token: string;
      password: string;
    };
    MessageResponse: {
      message: string;
    };
    RecoveryOtpRequest: {
      identifier: string;
    };
    VerifyRecoveryRequest: {
      identifier: string;
      otp: string;
      newPassword: string;
    };
    BandsListResponse: {
      bands: Array<{
        id: string;
        code: string;
        nameEn: string;
        nameNp: string | null;
        assessmentMode: string;
        aggregationRule: string | null;
        gradeRange: string | null;
      }>;
    };
    CalendarSetupRequest: {
      academicYearLabel: string;
      sessionStart: string;
      sessionEnd: string;
      /** ISO weekday: 1=Mon … 7=Sun */
      weeklyOffs: number[];
      terminals: Array<{
        name: string;
        sortOrder: number;
        startDate: string;
        endDate: string;
        reportingType: 'formative' | 'summative' | 'transition';
      }>;
    };
    CalendarSetupResponse: {
      schoolCalendarId: string;
      academicYearLabel: string;
      approvalStatus: 'draft';
    };
    CalendarStatusResponse: {
      approvalStatus: 'none' | 'draft' | 'approved';
      schoolCalendarId?: string;
      academicYearLabel?: string;
    };
    FestivalTemplateResponse: {
      schoolCalendarId: string;
      closures: Array<{
        id: string;
        name: string;
        startDate: string;
        endDate: string;
        source: 'festival_template';
      }>;
    };
    FestivalTemplatePatch: {
      closures: Array<{
        id?: string;
        name: string;
        startDate: string;
        endDate: string;
      }>;
    };
    CalendarApproveResponse: {
      schoolCalendarId: string;
      approvalStatus: 'approved';
      approvedAt: string;
    };
    TeachingDaysResponse: {
      schoolId: string;
      terminals: Array<{
        terminalId: string;
        terminalName: string;
        teachingDayCount: number;
      }>;
    };
  };
};
