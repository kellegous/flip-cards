require 'fileutils'
require 'open3'

CLOSURE_URL = 'http://dl.google.com/closure-compiler/compiler-latest.zip'

file 'tmp/node_modules/react-tools/bin/jsx' do |t|
  Process.wait spawn('npm', 'install', 'react-tools', :chdir => 'tmp')
end

file 'tmp/compiler.jar' do |task|
  Process.wait spawn('curl', '-O', CLOSURE_URL, :chdir => 'tmp')
  Process.wait spawn('unzip', 'compiler-latest.zip', :chdir => 'tmp')
end

task :checksass do
  version = ''
  begin
    IO.popen('sass --version') { |f|
      version = f.gets
    }
  rescue Exception
  end
  raise 'Sass 3.1.12 required' if version.index(/3\.2\.12/).nil?
end

['tmp', 'pub'].each do |x|
  file x do
    FileUtils::mkdir(x)
  end
end

FILES = ['src/pub/react.min.js', 'src/pub/frown.svg'].map { |src|
  dst = File.join('pub', File.basename(src))
  file dst => src do
    cp(src, dst)
  end
}

file 'pub/index.html' => 'src/pub/index.pub.html' do |t|
  cp(t.prerequisites.first, t.name)
end

file 'pub/math.css' => FileList['src/pub/math.main.scss', 'pub'] do |t|
  Process.wait spawn('sass', '--no-cache', t.prerequisites.first, t.name)
end

file 'pub/math.js' => FileList['src/pub/math.js', 'tmp/compiler.jar', 'tmp/node_modules/react-tools/bin/jsx'] do |task|
  Open3.pipeline(
    ['tmp/node_modules/react-tools/bin/jsx', 'src/pub/math.js'],
    ['java', '-jar', 'tmp/compiler.jar', '-O', 'SIMPLE', '--js_output_file', task.name]) { |i, o, e, t|
  }
end

task :setup => [:checksass, 'tmp', 'pub'] 
task :clean do
  rm_r('pub')
end
task :nuke do
  rm_r('tmp')
end

task :default => [:setup] + FILES + [
  'pub/index.html',
  'pub/math.css',
  'pub/math.js',
]