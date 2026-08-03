export type FanBoardPhoto = {
  path: string;
  url: string;
};

export type FanBoardReply = {
  id: string;
  displayName: string;
  body: string;
  photos: FanBoardPhoto[];
  createdAt: string;
};

export type FanBoardPost = FanBoardReply & {
  replies: FanBoardReply[];
};

export type FanBoardListResponse = {
  posts: FanBoardPost[];
};

export type FanBoardMutationResponse = {
  ok: boolean;
  error?: string;
};

