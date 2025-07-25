export const getPagination = (pageStr: string, limitStr: string) => {
    const page = parseInt(pageStr) || 1;
    const limit = parseInt(limitStr) || 10;
    const offset = (page - 1) * limit;
    return { page, limit, offset };
};

export const buildPaginatedResponse = <T>(
    data: T[],
    totalCount: number,
    page: number,
    limit: number
) => {
    return {
        data,
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
    };
};
