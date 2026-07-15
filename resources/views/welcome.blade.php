<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FireOps</title>

    {{-- This loads your React and CSS files through Vite --}}
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body>

    {{-- This is the empty box where React will build everything --}}
    <div id="app"></div>

</body>
</html>