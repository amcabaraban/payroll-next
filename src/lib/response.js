export function successResponse(data, message = 'Success') {
    return Response.json({
        success: true,
        message,
        data,
    });
}

export function errorResponse(message = 'Error', status = 400) {
    return Response.json(
        { success: false, message },
        { status }
    );
}